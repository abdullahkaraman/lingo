interface ScoreBoardProps {
  score: number
  remainingAttempts: number
  totalAttempts: number
  timerMax: number
  timeLeft: number
  wordsPlayed: number
  wordsGuessed: number
  isPlaying: boolean
}

function timerColor(t: number): string {
  if (t >= 7) return 'text-green-400'
  if (t >= 4) return 'text-yellow-400'
  return 'text-red-400'
}

function timerBarColor(t: number): string {
  if (t >= 7) return 'bg-green-500'
  if (t >= 4) return 'bg-yellow-500'
  return 'bg-red-500'
}

export function ScoreBoard({
  score, remainingAttempts, totalAttempts,
  timerMax, timeLeft, wordsPlayed, wordsGuessed, isPlaying,
}: ScoreBoardProps) {
  const pct = Math.max(0, (timeLeft / timerMax) * 100)
  const isUrgent = timeLeft <= 3 && isPlaying

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* Stats row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Puan</span>
          <span className="text-yellow-400 text-xl font-black tabular-nums">{score}</span>
        </div>

        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Tahmin</span>
          <span className="text-white text-xl font-black">{wordsGuessed}/{wordsPlayed}</span>
        </div>

        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Hak</span>
          <div className="flex gap-1 mt-0.5">
            {Array.from({ length: totalAttempts }, (_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full border transition-colors duration-300 ${
                  i < totalAttempts - remainingAttempts
                    ? 'bg-red-500 border-red-400'
                    : 'bg-zinc-700 border-zinc-500'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Timer display */}
        <div className="flex flex-col items-center min-w-[60px]">
          <span className="text-zinc-500 text-[10px] uppercase tracking-widest">Süre</span>
          <span className={`text-xl font-black tabular-nums transition-colors duration-300 ${timerColor(timeLeft)} ${isUrgent ? 'animate-timerPulse' : ''}`}>
            {timeLeft}s
          </span>
        </div>
      </div>

      {/* Timer progress bar */}
      <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerBarColor(timeLeft)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
