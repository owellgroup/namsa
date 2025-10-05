import React, { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { adminAPI } from '@/services/api';
import { LogSheet, ArtistWork } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const AdminPerformance: React.FC = () => {
  const [logSheets, setLogSheets] = useState<LogSheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const sheets = await adminAPI.getAllLogSheets().catch(() => []);
        setLogSheets(sheets);
      } catch (err) {
        toast({ title: 'Error', description: 'Failed to load log sheets', variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key !== 'namsa:update') return;
      try {
        const payload = JSON.parse(e.newValue || '{}');
        if (payload?.type === 'music' || payload?.type === 'profile') {
          load();
          toast({ title: 'Performance Data Updated' });
        }
      } catch (err) {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [toast]);

  // Aggregate data
  const { songCounts, artistCounts, companyCounts } = useMemo(() => {
    const songMap: Record<number, { title: string; count: number; track?: ArtistWork }> = {};
    const artistMap: Record<string, number> = {};
    const companyMap: Record<string, number> = {};

    for (const sheet of logSheets) {
      const companyName = sheet.company?.companyName || 'Unknown Company';
      for (const m of sheet.selectedMusic || []) {
        const id = (m as any).id;
        if (!id) continue;
        const title = (m as any).title || `Track ${id}`;
        const artistName = (m as any).user?.email || (m as any).artist || 'Unknown Artist';

        if (!songMap[id]) songMap[id] = { title, count: 0, track: m as any };
        songMap[id].count += 1;

        artistMap[artistName] = (artistMap[artistName] || 0) + 1;
        companyMap[companyName] = (companyMap[companyName] || 0) + 1;
      }
    }

    return {
      songCounts: Object.entries(songMap).map(([id, v]) => ({ id: parseInt(id), title: v.title, count: v.count })),
      artistCounts: Object.entries(artistMap).map(([artist, count]) => ({ artist, count })),
      companyCounts: Object.entries(companyMap).map(([company, count]) => ({ company, count })),
    } as any;
  }, [logSheets]);

  const tracksList = useMemo(() => {
    const list = songCounts.map((s: any) => ({ id: s.id, title: s.title }));
    return list.sort((a: any, b: any) => a.title.localeCompare(b.title));
  }, [songCounts]);

  const filteredTracks = useMemo(() => {
    if (!search.trim()) return tracksList;
    const q = search.toLowerCase();
    return tracksList.filter((t: any) => t.title.toLowerCase().includes(q));
  }, [tracksList, search]);

  const selectedCompanyData = useMemo(() => {
    if (!selectedTrackId) return [] as { company: string; count: number }[];
    const map: Record<string, number> = {};
    for (const sheet of logSheets) {
      const companyName = sheet.company?.companyName || 'Unknown Company';
      for (const m of sheet.selectedMusic || []) {
        const id = (m as any).id;
        if (id === selectedTrackId) {
          map[companyName] = (map[companyName] || 0) + 1;
        }
      }
    }
    return Object.entries(map).map(([company, count]) => ({ company, count }));
  }, [logSheets, selectedTrackId]);

  const topSongs = useMemo(() => songCounts.sort((a: any, b: any) => b.count - a.count).slice(0, 10), [songCounts]);
  const topArtists = useMemo(() => artistCounts.sort((a: any, b: any) => b.count - a.count).slice(0, 10), [artistCounts]);
  const topCompanies = useMemo(() => companyCounts.sort((a: any, b: any) => b.count - a.count).slice(0, 10), [companyCounts]);

  return (
    <DashboardLayout title="Performance Overview">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance (Admin)</h1>
          <p className="text-muted-foreground">Aggregate track, artist and company performance across all log sheets</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Track Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input placeholder="Search track..." value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="md:col-span-2">
                <Select value={selectedTrackId?.toString() || ''} onValueChange={(v) => setSelectedTrackId(v ? parseInt(v) : null)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a track" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTracks.map((t: any) => (
                      <SelectItem key={t.id} value={t.id.toString()}>{t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-6">
              {selectedTrackId ? (
                selectedCompanyData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No selections for the chosen track.</div>
                ) : (
                  <div style={{ width: '100%', height: 320 }}>
                    <ResponsiveContainer width="100%" height={320}>
                      <BarChart data={selectedCompanyData} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="company" angle={-30} textAnchor="end" interval={0} height={60} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )
              ) : (
                <div className="text-sm text-muted-foreground">Search and select a track to see its performance by company.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Songs</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-48 bg-muted rounded animate-pulse" />
            ) : topSongs.length === 0 ? (
              <p className="text-muted-foreground">No log sheet activity found.</p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-2">Top Songs by Selections</h4>
                  <div className="space-y-2">
                    {topSongs.map((s: any) => (
                      <div key={s.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="text-sm">{s.title}</div>
                        <div className="font-semibold">{s.count}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold mb-2">Chart</h4>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={topSongs.map((s: any) => ({ name: s.title, count: s.count }))} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" fill="#82ca9d" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Artists</CardTitle>
            </CardHeader>
            <CardContent>
              {topArtists.length === 0 ? (
                <p className="text-muted-foreground">No artist activity</p>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={topArtists.map((a: any) => ({ name: a.artist, count: a.count }))} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Companies</CardTitle>
            </CardHeader>
            <CardContent>
              {topCompanies.length === 0 ? (
                <p className="text-muted-foreground">No company activity</p>
              ) : (
                <div style={{ width: '100%', height: 300 }}>
                  <ResponsiveContainer>
                    <BarChart data={topCompanies.map((c: any) => ({ name: c.company, count: c.count }))} margin={{ top: 10, right: 20, left: 0, bottom: 80 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-45} textAnchor="end" interval={0} height={80} />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ffc658" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminPerformance;
