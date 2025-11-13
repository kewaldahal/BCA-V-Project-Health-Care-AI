
import React from 'react';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';

interface HealthScoreGaugeProps {
  score: number;
}

const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ score }) => {
  const data = [{ name: 'Health Score', value: score }];
  
  const getColor = (value: number) => {
    if (value >= 80) return '#10B981'; // Green
    if (value >= 50) return '#F59E0B'; // Yellow
    return '#EF4444'; // Red
  };

  return (
    <div style={{ width: '100%', height: 250 }}>
      <ResponsiveContainer>
        <RadialBarChart
          innerRadius="70%"
          outerRadius="100%"
          data={data}
          startAngle={180}
          endAngle={0}
          barSize={30}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, 100]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background
            dataKey="value"
            angleAxisId={0}
            fill={getColor(score)}
            cornerRadius={15}
          />
          <text
            x="50%"
            y="55%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-5xl font-bold fill-current text-gray-900 dark:text-white"
          >
            {score}
          </text>
          <text
            x="50%"
            y="70%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-lg font-medium fill-current text-gray-500 dark:text-gray-400"
          >
            / 100
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HealthScoreGauge;