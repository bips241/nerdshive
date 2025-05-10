'use client';
import { useEffect, useState } from 'react';

interface PollOption {
  text: string;
}

interface PollStats {
  totalVotes: number;
  optionCounts: { [key: number]: number };
}

export default function Poll({ pollId, userId, pollOptions }: { pollId: string; userId:string; pollOptions: PollOption[] }) {
  const [pollStats, setPollStats] = useState<PollStats | null>(null);

  const fetchStats = async () => {
    const res = await fetch(`/api/poll-votes/${pollId}`);
    const data = await res.json();
    setPollStats(data);
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000); // every 5 sec refresh
    return () => clearInterval(interval);
  }, []);

  const handleVote = async (index: number) => {
    await fetch(`/api/update-result`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId, userId, selectedOptionIndex: index }),
    });
    fetchStats(); // refresh immediately after voting
  };

  return (
    <div className="flex flex-col space-y-4 w-full max-w-md p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-white text-center mb-4">Vote Your Choice</h2>
      {pollOptions.map((option, idx) => {
        const count = pollStats?.optionCounts?.[idx] || 0;
        const percentage = pollStats && pollStats.totalVotes > 0
          ? ((count / pollStats.totalVotes) * 100).toFixed(1)
          : '0';

        return (
          <button
            key={idx}
            onClick={async () => await handleVote(idx)}
            className="w-full border border-transparent rounded-full px-6 py-3 text-center font-semibold text-white bg-purple-400 hover:bg-purple-600 transition transform hover:scale-105 shadow-md"
          >
            <div className="flex justify-between items-center">
              <span>{option.text}</span>
              {pollStats && (
                <span className="text-sm font-light">
                  {percentage}% ({count} votes)
                </span>
              )}
            </div>
          </button>
        );
      })}
      <div className="text-center text-white mt-4">
        {pollStats ? (
          <p>Total Votes: <span className="font-bold">{pollStats.totalVotes}</span></p>
        ) : (
          <p>Loading stats...</p>
        )}
      </div>
    </div>
  );
}
