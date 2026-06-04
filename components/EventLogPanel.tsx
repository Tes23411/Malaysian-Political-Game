
import React, { useRef, useEffect } from 'react';
import { LogEntry } from '../types';
import * as reactWindow from 'react-window';
const { FixedSizeList: List } = reactWindow as any;

interface EventLogPanelProps {
  logEntries: LogEntry[];
  onClose: () => void;
}

const EventLogPanel: React.FC<EventLogPanelProps> = React.memo(({ logEntries, onClose }) => {
  const listRef = useRef<any>(null);

  useEffect(() => {
    if (listRef.current && logEntries.length > 0) {
      listRef.current.scrollToItem(logEntries.length - 1, 'end');
    }
  }, [logEntries.length]);

  const getBorderColor = (type: string) => {
      switch(type) {
          case 'event': return 'border-yellow-500';
          case 'politics': return 'border-blue-500';
          case 'election': return 'border-green-500';
          case 'personal': return 'border-purple-500';
          default: return 'border-gray-500';
      }
  };

  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => {
    const entry = logEntries[index];
    return (
      <div style={style} className="pr-2 pb-2">
        <div className={`p-3 bg-gray-800 rounded border-l-4 ${getBorderColor(entry.type)} text-sm h-full`}>
            <div className="flex justify-between items-baseline mb-1">
                <span className="font-bold text-gray-300">{entry.title}</span>
                <span className="text-xs text-gray-500 font-mono">{entry.date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
            </div>
            <p className="text-gray-400 leading-snug text-xs line-clamp-2">{entry.description}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="absolute bottom-20 right-4 h-[400px] w-[350px] bg-gray-900 bg-opacity-95 text-white p-4 shadow-xl overflow-hidden font-sans z-10 flex flex-col rounded-lg border border-gray-600">
      <div className="flex justify-between items-center mb-2 shrink-0 border-b border-gray-700 pb-2">
        <h2 className="text-lg font-bold text-gray-200">Event Log</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
      </div>
      
      <div className="flex-grow w-full">
        {logEntries.length === 0 ? (
            <p className="text-gray-500 text-sm text-center italic mt-10">No events logged yet.</p>
        ) : (
            <List
              ref={listRef}
              height={320}
              itemCount={logEntries.length}
              itemSize={90}
              width="100%"
            >
              {Row}
            </List>
        )}
      </div>
    </div>
  );
});

export default EventLogPanel;

