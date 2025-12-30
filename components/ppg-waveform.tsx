'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { PPGData } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface PPGWaveformProps {
  data: PPGData[];
}

export function PPGWaveform({ data }: PPGWaveformProps) {
  const chartData = data.map((d, i) => ({
    index: i,
    value: d.value,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Onde PPG (Photopléthysmographie)</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 240)" />
            <XAxis 
              dataKey="index" 
              hide
            />
            <YAxis 
              hide
              domain={[0, 200]}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="oklch(0.65 0.15 200)" 
              fill="oklch(0.65 0.15 200 / 0.2)"
              strokeWidth={2}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
