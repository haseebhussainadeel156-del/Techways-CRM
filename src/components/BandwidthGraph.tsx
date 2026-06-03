import React, { useState, useEffect } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface DataPoint {
  time: string;
  upload: number;
  download: number;
}

const BandwidthGraph: React.FC = () => {
  const [data, setData] = useState<DataPoint[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      
      const newDataPoint: DataPoint = {
        time,
        upload: Math.random() * 5 + 2, // Mock data
        download: Math.random() * 20 + 10,
      };

      setData(prev => {
        const newData = [...prev, newDataPoint];
        if (newData.length > 20) return newData.slice(newData.length - 20);
        return newData;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl w-full h-[300px]">
      <h3 className="text-sm font-bold text-slate-100 mb-4 uppercase font-mono">Current Bandwidth Usage (Mbps)</h3>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="time" stroke="#94a3b8" fontSize={10} />
          <YAxis stroke="#94a3b8" fontSize={10} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155' }}
            itemStyle={{ fontSize: '12px' }}
          />
          <Area type="monotone" dataKey="download" stackId="1" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} name="Download" />
          <Area type="monotone" dataKey="upload" stackId="2" stroke="#f43f5e" fill="#f43f5e" fillOpacity={0.3} name="Upload" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BandwidthGraph;
