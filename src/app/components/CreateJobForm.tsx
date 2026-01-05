'use client';

import { useState } from 'react';

export default function CreateJobForm({ onJobCreated }: { onJobCreated: (jobId: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      imageUrl: formData.get('imageUrl') as string,
      style: formData.get('style') as string,
      hookText: formData.get('hookText') as string,
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error('Failed to create job');

      const { jobId } = await res.json();
      onJobCreated(jobId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gray-900 p-6 rounded-lg border border-gray-800">
      <div>
        <label className="block text-sm font-medium mb-1">Image URL (or mock)</label>
        <input
          name="imageUrl"
          defaultValue="https://example.com/me.jpg"
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Style</label>
        <select
          name="style"
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
        >
          <option value="cyberpunk">Cyberpunk</option>
          <option value="cinematic">Cinematic</option>
          <option value="anime">Anime</option>
          <option value="vaporwave">Vaporwave</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Hook Text (Overlay)</label>
        <input
          name="hookText"
          defaultValue="Wait for the drop..."
          className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-white"
          required
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-2 px-4 rounded transition"
      >
        {loading ? 'Creating Job...' : 'Generate Viral Video'}
      </button>
    </form>
  );
}
