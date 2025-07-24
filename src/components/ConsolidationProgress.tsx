import React from 'react';
import { ConsolidationProgress } from '../services/pdfConsolidation.service';

interface ConsolidationProgressProps {
  progress: ConsolidationProgress;
  onCancel?: () => void;
}

const formatTime = (ms: number): string => {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
};

const formatMemory = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

export const ConsolidationProgressComponent: React.FC<ConsolidationProgressProps> = ({
  progress,
  onCancel
}) => {
  return (
    <div className="consolidation-progress bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          Consolidating PDF Files
        </h3>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Progress</span>
          <span>{Math.round(progress.percentage)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress.percentage}%` }}
          />
        </div>
      </div>

      {/* File Progress */}
      <div className="mb-4">
        <div className="text-sm text-gray-600 mb-1">
          Processing Files
        </div>
        <div className="text-lg font-medium text-gray-800">
          {progress.currentFile} of {progress.totalFiles}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-gray-600 mb-1">Memory Usage</div>
          <div className="font-medium text-gray-800">
            {formatMemory(progress.memoryUsage)}
          </div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Processing Speed</div>
          <div className="font-medium text-gray-800">
            {progress.processingSpeed.toFixed(1)} files/sec
          </div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">Chunk Size</div>
          <div className="font-medium text-gray-800">
            {progress.currentChunkSize} files
          </div>
        </div>
        <div>
          <div className="text-gray-600 mb-1">ETA</div>
          <div className="font-medium text-gray-800">
            {formatTime(progress.estimatedTimeRemaining)}
          </div>
        </div>
      </div>

      {/* Status Message */}
      <div className="mt-4 p-3 bg-blue-50 rounded-md">
        <div className="text-sm text-blue-800">
          {progress.currentFile === progress.totalFiles 
            ? 'Finalizing consolidation...'
            : `Processing file ${progress.currentFile} of ${progress.totalFiles}`
          }
        </div>
      </div>
    </div>
  );
};

export default ConsolidationProgressComponent; 