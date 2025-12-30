'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { HeartRateData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface HeartRateChartProps {
  data: HeartRateData[];
  minThreshold?: number;
  maxThreshold?: number;
  showThresholds?: boolean;
}

export function HeartRateChart({ data, minThreshold, maxThreshold, showThresholds = false }: HeartRateChartProps) {
  const chartData = data.map(d => ({
    time: d.timestamp.toLocaleTimeString(),
    bpm: Math.round(d.bpm),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Fréquence Cardiaque en Temps Réel</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" />
            <XAxis 
              dataKey="time" 
              stroke="oklch(0.5 0.015 240)"
              tick={{ fill: 'oklch(0.5 0.015 240)' }}
              tickLine={{ stroke: 'oklch(0.5 0.015 240)' }}
            />
            <YAxis 
              stroke="oklch(0.5 0.015 240)"
              tick={{ fill: 'oklch(0.5 0.015 240)' }}
              tickLine={{ stroke: 'oklch(0.5 0.015 240)' }}
              domain={[40, 180]}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'oklch(1 0 0)', 
                border: '1px solid oklch(0.92 0.01 240)',
                borderRadius: '0.5rem'
              }}
            />
            {showThresholds && maxThreshold && (
              <ReferenceLine 
                y={maxThreshold} 
                stroke="oklch(0.55 0.22 25)" 
                strokeDasharray="3 3"
                label={{ value: 'Max', fill: 'oklch(0.55 0.22 25)' }}
              />
            )}
            {showThresholds && minThreshold && (
              <ReferenceLine 
                y={minThreshold} 
                stroke="oklch(0.55 0.22 25)" 
                strokeDasharray="3 3"
                label={{ value: 'Min', fill: 'oklch(0.55 0.22 25)' }}
              />
            )}
            <Line 
              type="monotone" 
              dataKey="bpm" 
              stroke="oklch(0.55 0.18 245)" 
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
