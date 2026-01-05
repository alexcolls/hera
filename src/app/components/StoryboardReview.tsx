'use client';

import { Scene } from '@/lib/types/job';
import { useState } from 'react';

interface StoryboardReviewProps {
  jobId: string;
  scenes: Scene[];
  onApprove: () => void;
  onRegenerateScene: (sceneId: string) => void;
}

export default function StoryboardReview({ jobId, scenes, onApprove, onRegenerateScene }: StoryboardReviewProps) {
  const [approving, setApproving] = useState(false);

  const handleApprove = async () => {
    setApproving(true);
    try {
      await fetch(`/api/jobs/${jobId}/approve`, { method: 'POST' });
      onApprove();
    } catch (error) {
      console.error('Failed to approve:', error);
      setApproving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-end border-b border-white/20 pb-4">
        <div>
          <h2 className="text-xl font-bold uppercase tracking-widest text-white">Storyboard Review</h2>
          <p className="text-xs font-mono text-gray-500 mt-2">Confirm visual consistency before video generation.</p>
        </div>
        <button
          onClick={handleApprove}
          disabled={approving}
          className="bg-white text-black hover:bg-gray-200 px-6 py-2 text-xs font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
        >
          {approving ? 'Processing...' : 'Approve & Animate'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="group relative border border-gray-800 bg-gray-900 aspect-[9/16] overflow-hidden">
            <div className="absolute top-2 left-2 z-10 bg-black/50 backdrop-blur px-2 py-1 text-[10px] font-mono text-white border border-white/10">
              SCENE {String(index + 1).padStart(2, '0')}
            </div>
            
            {scene.imageUrl ? (
              <img 
                src={scene.imageUrl} 
                alt={scene.prompt}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-700 font-mono text-xs animate-pulse">
                GENERATING_IMAGE...
              </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <p className="text-[10px] font-mono text-gray-300 line-clamp-3 mb-2">{scene.prompt}</p>
              {/* <button 
                onClick={() => onRegenerateScene(scene.id)}
                className="w-full border border-white/20 hover:bg-white hover:text-black text-white text-[10px] uppercase py-2 transition-colors"
              >
                Regenerate
              </button> */}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
