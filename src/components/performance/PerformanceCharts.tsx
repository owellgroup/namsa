import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { LogSheet, ArtistWork } from '@/types';

interface PerformanceChartsProps {
  logSheets: LogSheet[];
  tracks: ArtistWork[];
  userId?: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({ logSheets, tracks, userId }) => {
  const performanceData = useMemo(() => {
    const trackMap: Record<
      number,
      {
        title: string;
        totalSelections: number;
        companies: Record<string, number>;
        timeline: Record<string, number>;
      }
    > = {};

    const companyMap: Record<string, number> = {};
    const timelineMap: Record<string, number> = {};

    for (const sheet of logSheets) {
      const companyName = sheet.company?.companyName || 'Unknown';
      const date = new Date(sheet.createdDate).toLocaleDateString();

      for (const music of sheet.selectedMusic || []) {
        const mid = (music as any).id;
        const musicUserId = (music as any).user?.id;

        if (userId && musicUserId !== userId) continue;

        if (!trackMap[mid]) {
          trackMap[mid] = {
            title: (music as any).title || `Track ${mid}`,
            totalSelections: 0,
            companies: {},
            timeline: {}
          };
        }

        trackMap[mid].totalSelections += 1;
        trackMap[mid].companies[companyName] = (trackMap[mid].companies[companyName] || 0) + 1;
        trackMap[mid].timeline[date] = (trackMap[mid].timeline[date] || 0) + 1;

        companyMap[companyName] = (companyMap[companyName] || 0) + 1;
        timelineMap[date] = (timelineMap[date] || 0) + 1;
      }
    }

    const topTracks = Object.entries(trackMap)
      .map(([id, data]) => ({ id: parseInt(id), ...data }))
      .sort((a, b) => b.totalSelections - a.totalSelections)
      .slice(0, 10);

    const companyData = Object.entries(companyMap).map(([name, count]) => ({ name, count }));

    const timelineData = Object.entries(timelineMap)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-30);

    return {
      topTracks,
      companyData,
      timelineData,
      totalSelections: Object.values(trackMap).reduce((sum, t) => sum + t.totalSelections, 0)
    };
  }, [logSheets, userId]);

  if (performanceData.totalSelections === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No performance data available yet. Your music needs to be selected in log sheets to see statistics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Selections</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{performanceData.totalSelections}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Tracks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{performanceData.topTracks.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{performanceData.companyData.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top Track</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{performanceData.topTracks[0]?.title || '-'}</div>
            <p className="text-xs text-muted-foreground">{performanceData.topTracks[0]?.totalSelections || 0} selections</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Tracks by Selections</CardTitle>
            <CardDescription>Your most selected tracks</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={performanceData.topTracks.slice(0, 5)} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" angle={-30} textAnchor="end" height={80} interval={0} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalSelections" fill="#8884d8" name="Selections" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Company Distribution</CardTitle>
            <CardDescription>Selections by company</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={performanceData.companyData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {performanceData.companyData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selection Timeline</CardTitle>
          <CardDescription>Track selections over time (last 30 days)</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <LineChart data={performanceData.timelineData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" stroke="#8884d8" name="Selections" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Track Details</CardTitle>
          <CardDescription>Detailed breakdown of your tracks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {performanceData.topTracks.map((track) => (
              <div key={track.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold">{track.title}</h4>
                  <span className="text-lg font-bold text-namsa-success">{track.totalSelections} selections</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {Object.entries(track.companies).map(([company, count]) => (
                    <div key={company} className="text-muted-foreground">
                      <span className="font-medium">{company}:</span> {count}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceCharts;
