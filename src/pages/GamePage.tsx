/**
 * Coordinates the race session while presentation lives in focused game UI
 * components. This module is the single owner of game-state transitions,
 * monotonic timing, audio lifecycle, leaderboard persistence, and control
 * resets. RaceLifecycle generations make countdown/finish callbacks cancellable.
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { AudioEngine } from "@/game/AudioEngine";
import { resetControls } from "@/game/controls";
import ErrorBoundary from "@/game/ErrorBoundary";
import HUD from "@/game/HUD";
import Leaderboard from "@/game/Leaderboard";
import { createLeaderboardEntry, loadLeaderboard, normalizeLeaderboard, saveLeaderboard, type LeaderboardEntry } from "@/game/leaderboardStorage";
import PauseMenu from "@/game/PauseMenu";
import RacingGame from "@/game/RacingGame";
import { RaceLifecycle } from "@/game/raceLifecycle";
import { RaceClock } from "@/game/time";
import TrackSelectionMenu from "@/game/TrackSelectionMenu";
import { TRACKS, type TrackDef } from "@/game/tracks";
import { hexToRgb } from "@/game/color";

const TOTAL_LAPS = 3;
type GameState = "menu" | "countdown" | "racing" | "finished";

export default function GamePage() {
  const [gameState, setGameState] = useState<GameState>("menu");
  const [paused, setPaused] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackDef>(TRACKS[0]);
  const [countdown, setCountdown] = useState(3);
  const [currentLap, setCurrentLap] = useState(0);
  const [lapTime, setLapTime] = useState(0);
  const [lastLapTime, setLastLapTime] = useState<number | null>(null);
  const [bestLapTime, setBestLapTime] = useState<number | null>(null);
  const [totalTime, setTotalTime] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [boosting, setBoosting] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(loadLeaderboard);
  const [latestEntry, setLatestEntry] = useState<LeaderboardEntry | undefined>();
  const [isTouchDevice, setIsTouchDevice] = useState(() => window.matchMedia("(pointer: coarse)").matches);
  const [muted, setMuted] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string>();

  const lapTimesRef = useRef<number[]>([]);
  const audioRef = useRef<AudioEngine | null>(null);
  const clockRef = useRef<RaceClock | null>(null);
  const lifecycleRef = useRef<RaceLifecycle | null>(null);
  if (audioRef.current === null) audioRef.current = new AudioEngine();
  if (clockRef.current === null) clockRef.current = new RaceClock();
  if (lifecycleRef.current === null) lifecycleRef.current = new RaceLifecycle();

  const rafRef = useRef(0);
  const currentLapRef = useRef(0);
  const currentRaceTokenRef = useRef(0);
  const completionPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const gameStateRef = useRef<GameState>("menu");
  const pausedRef = useRef(false);
  const focusBeforePauseRef = useRef<HTMLElement | null>(null);

  const clearPendingTimers = useCallback(() => lifecycleRef.current!.cancel(), []);

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouchDevice(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    if (audioRef.current === null) audioRef.current = new AudioEngine();
    const audio = audioRef.current;
    return () => {
      mountedRef.current = false;
      clearPendingTimers();
      cancelAnimationFrame(rafRef.current);
      resetControls();
      if (audioRef.current === audio) audioRef.current = null;
      void audio.destroy();
    };
  }, [clearPendingTimers]);

  useEffect(() => {
    if (gameState !== "racing" || paused) return;
    const tick = () => {
      const snapshot = clockRef.current!.snapshot();
      setLapTime(snapshot.lapTime);
      setTotalTime(snapshot.totalTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, paused]);

  useEffect(() => {
    if (gameState !== "racing") return;
    if (paused) void audioRef.current?.pauseAudio();
    else void audioRef.current?.resumeAudio();
  }, [paused, gameState]);

  const startCountdown = useCallback(() => {
    const generation = lifecycleRef.current!.begin();
    currentRaceTokenRef.current = generation;
    resetControls();
    clockRef.current!.reset();
    audioRef.current!.stopMusic();
    audioRef.current!.stopEngine();
    void audioRef.current!.init().then((ready) => {
      if (ready && mountedRef.current && lifecycleRef.current?.isCurrent(generation)) audioRef.current?.startMusic();
    });

    gameStateRef.current = "countdown";
    setGameState("countdown");
    pausedRef.current = false;
    setPaused(false);
    setCountdown(3);
    setCurrentLap(0);
    setLapTime(0);
    setLastLapTime(null);
    setBestLapTime(null);
    setTotalTime(0);
    setSpeed(0);
    setBoosting(false);
    setLatestEntry(undefined);
    setStorageWarning(undefined);
    lapTimesRef.current = [];
    currentLapRef.current = 0;
    completionPendingRef.current = false;

    const deadline = performance.now() + 3000;
    const countdownInterval = lifecycleRef.current!.setInterval(generation, () => {
      setCountdown(Math.max(1, Math.ceil((deadline - performance.now()) / 1000)));
    }, 100);
    lifecycleRef.current!.setTimeout(generation, () => {
      if (!mountedRef.current) return;
      lifecycleRef.current!.clearInterval(countdownInterval);
      clockRef.current!.start();
      setCountdown(0);
      gameStateRef.current = "racing";
      setGameState("racing");
    }, 3000);
  }, []);

  const handleLap = useCallback(() => {
    if (gameStateRef.current !== "racing" || pausedRef.current || completionPendingRef.current) return;
    const completedLap = clockRef.current!.completeLap();
    if (!Number.isFinite(completedLap) || completedLap <= 0) return;
    const newLap = currentLapRef.current + 1;
    currentLapRef.current = newLap;
    lapTimesRef.current.push(completedLap);
    setCurrentLap(newLap);
    setLastLapTime(completedLap);
    setBestLapTime((best) => best === null ? completedLap : Math.min(best, completedLap));

    if (newLap < TOTAL_LAPS) return;
    const generation = currentRaceTokenRef.current;
    if (!lifecycleRef.current!.claimCompletion(generation)) return;
    completionPendingRef.current = true;
    const totalRaceTime = clockRef.current!.snapshot().totalTime;
    lifecycleRef.current!.setTimeout(generation, () => {
      if (!mountedRef.current || gameStateRef.current !== "racing") return;
      audioRef.current?.stopMusic();
      audioRef.current?.stopEngine();
      resetControls();
      const best = Math.min(...lapTimesRef.current);
      const entry = createLeaderboardEntry(selectedTrack.id, totalRaceTime, best);
      const updated = normalizeLeaderboard([...leaderboard, entry]);
      setLatestEntry(entry);
      if (saveLeaderboard(updated)) setLeaderboard(updated);
      else setStorageWarning("Result shown, but this browser could not save it.");
      gameStateRef.current = "finished";
      setGameState("finished");
    }, 500);
  }, [leaderboard, selectedTrack.id]);

  const handleSpeedChange = useCallback((nextSpeed: number) => {
    setSpeed(nextSpeed);
    audioRef.current?.setSpeed(nextSpeed);
  }, []);

  const handleBoostChange = useCallback((nextBoosting: boolean) => {
    setBoosting(nextBoosting);
    if (nextBoosting) audioRef.current?.playBoost();
  }, []);

  const handlePause = useCallback(() => {
    if (gameStateRef.current !== "racing" || completionPendingRef.current) return;
    if (pausedRef.current) {
      clockRef.current!.resume();
      pausedRef.current = false;
      setPaused(false);
      window.setTimeout(() => focusBeforePauseRef.current?.focus(), 0);
    } else {
      focusBeforePauseRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      clockRef.current!.pause();
      pausedRef.current = true;
      resetControls();
      setPaused(true);
    }
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.code === "Escape" && gameStateRef.current === "racing") handlePause(); };
    const onVisibility = () => { if (document.hidden && gameStateRef.current === "racing" && !pausedRef.current) handlePause(); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [handlePause]);

  const handleRestart = useCallback(() => startCountdown(), [startCountdown]);
  const handleChangeTrack = useCallback(() => {
    clearPendingTimers();
    clockRef.current!.reset();
    pausedRef.current = false;
    resetControls();
    setPaused(false);
    audioRef.current?.stopMusic();
    audioRef.current?.stopEngine();
    void audioRef.current?.resumeAudio();
    gameStateRef.current = "menu";
    setGameState("menu");
  }, [clearPendingTimers]);

  const handleMuteToggle = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      audioRef.current?.setMuted(next);
      return next;
    });
  }, []);

  const accent = selectedTrack.accentColor;
  const actionStyle = {
    "--accent": accent,
    "--accent-rgb": hexToRgb(accent),
  } as CSSProperties;

  return (
    <div className="game-page" style={actionStyle}>
      <div className="game-canvas">
        <ErrorBoundary>
          <RacingGame
            onLap={handleLap}
            onBoostChange={handleBoostChange}
            onSpeedChange={handleSpeedChange}
            racing={gameState === "racing" && !paused}
            trackDef={selectedTrack}
            showTouchControls={isTouchDevice}
          />
        </ErrorBoundary>
      </div>

      {(gameState === "racing" || gameState === "countdown") && (
        <div className="game-hud">
          <HUD speed={speed} lap={currentLap} totalLaps={TOTAL_LAPS} lapTime={lapTime} bestLapTime={bestLapTime}
            lastLapTime={lastLapTime} totalTime={totalTime} boosting={boosting} countdown={countdown} isTouchDevice={isTouchDevice} />
        </div>
      )}

      {(gameState === "racing" || gameState === "countdown") && !paused && (
        <button type="button" aria-label={muted ? "Unmute audio" : "Mute audio"} aria-pressed={muted}
          onClick={handleMuteToggle} title={muted ? "Įjungti garsą" : "Išjungti garsą"}
          className="game-action-button mute-button" style={{ color: muted ? "#ffffff44" : accent }}>
          {muted ? "🔇" : "🔊"}
        </button>
      )}

      {gameState === "racing" && !paused && (
        <button type="button" aria-label="Pause race" onClick={handlePause} className="game-action-button pause-button">
          ⏸ PAUZĖ
        </button>
      )}

      {gameState === "racing" && paused && (
        <PauseMenu accentColor={accent} onResume={handlePause} onRestart={handleRestart}
          onChangeTrack={handleChangeTrack} onCancel={handleChangeTrack} />
      )}

      {gameState === "menu" && (
        <TrackSelectionMenu selectedTrack={selectedTrack} isTouchDevice={isTouchDevice} totalLaps={TOTAL_LAPS}
          onSelect={setSelectedTrack} onStart={startCountdown} />
      )}

      {gameState === "finished" && (
        <Leaderboard entries={leaderboard} latestEntry={latestEntry} onPlay={handleChangeTrack}
          title="RACE COMPLETE" storageWarning={storageWarning} />
      )}
    </div>
  );
}
