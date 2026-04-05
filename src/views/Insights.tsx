import { useState, useEffect } from 'react';
import { TopBar } from '../components/layout/TopBar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getActivitiesInRange } from '@/db/queries';
import type { AtlasActivity } from '@/db/schema';
import { Sparkles, Brain, Heart, TrendingUp, Target, Loader2, KeyRound, AlertCircle } from 'lucide-react';

const API_KEY_STORAGE = 'atlas-anthropic-key';

interface InsightSection {
  title: string;
  content: string;
  icon: typeof Sparkles;
  color: string;
}

function buildPrompt(activities: AtlasActivity[]): string {
  const sportMap = new Map<string, { count: number; distance: number; duration: number; calories: number; hrSum: number; hrCount: number }>();

  for (const a of activities) {
    const entry = sportMap.get(a.sport) || { count: 0, distance: 0, duration: 0, calories: 0, hrSum: 0, hrCount: 0 };
    entry.count++;
    entry.distance += a.distance || 0;
    entry.duration += a.duration || 0;
    entry.calories += a.calories || 0;
    if (a.avgHR) {
      entry.hrSum += a.avgHR;
      entry.hrCount++;
    }
    sportMap.set(a.sport, entry);
  }

  const sportSummaries = Array.from(sportMap.entries()).map(([sport, data]) => ({
    sport,
    activities: data.count,
    totalDistanceKm: Math.round(data.distance / 1000 * 10) / 10,
    totalDurationHours: Math.round(data.duration / 3600 * 10) / 10,
    totalCalories: Math.round(data.calories),
    avgHR: data.hrCount > 0 ? Math.round(data.hrSum / data.hrCount) : null,
  }));

  const summary = {
    period: 'Last 90 days',
    totalActivities: activities.length,
    sports: sportSummaries,
  };

  return `You are a sports science analyst reviewing training data. Given the following 90-day activity summary, provide insights in EXACTLY this format with these 4 section headers on their own lines:

## Fitness Narrative
(2-3 sentences summarizing the overall training picture)

## Recovery Signals
(2-3 sentences about recovery patterns, training balance, and potential overtraining risks based on volume and intensity)

## Performance Observations
(2-3 sentences about performance trends, sport-specific notes, and areas of strength)

## One Thing
(1 sentence: the single most actionable recommendation to focus on)

Training data:
${JSON.stringify(summary, null, 2)}`;
}

function parseResponse(text: string): InsightSection[] {
  const sections: InsightSection[] = [];
  const configs: { key: string; title: string; icon: typeof Sparkles; color: string }[] = [
    { key: '## Fitness Narrative', title: 'Fitness Narrative', icon: Brain, color: 'var(--atlas-sky)' },
    { key: '## Recovery Signals', title: 'Recovery Signals', icon: Heart, color: 'var(--atlas-sage)' },
    { key: '## Performance Observations', title: 'Performance Observations', icon: TrendingUp, color: 'var(--atlas-peach)' },
    { key: '## One Thing', title: 'One Thing', icon: Target, color: 'var(--atlas-sky)' },
  ];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    const startIdx = text.indexOf(config.key);
    if (startIdx === -1) continue;

    const contentStart = startIdx + config.key.length;
    const nextIdx = i < configs.length - 1 ? text.indexOf(configs[i + 1].key) : -1;
    const content = nextIdx > -1
      ? text.slice(contentStart, nextIdx).trim()
      : text.slice(contentStart).trim();

    sections.push({
      title: config.title,
      content,
      icon: config.icon,
      color: config.color,
    });
  }

  return sections;
}

export function Insights() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [keyInput, setKeyInput] = useState(() => localStorage.getItem(API_KEY_STORAGE) || '');
  const [sections, setSections] = useState<InsightSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (apiKey) {
      localStorage.setItem(API_KEY_STORAGE, apiKey);
    }
  }, [apiKey]);

  const saveKey = () => {
    const trimmed = keyInput.trim();
    if (trimmed) {
      setApiKey(trimmed);
      localStorage.setItem(API_KEY_STORAGE, trimmed);
    }
  };

  const generateInsights = async () => {
    if (!apiKey) {
      setError('Please enter your Anthropic API key first.');
      return;
    }

    setLoading(true);
    setError(null);
    setSections([]);

    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const startDate = start.toISOString().slice(0, 10);
      const endDate = end.toISOString().slice(0, 10);

      const activities = await getActivitiesInRange(startDate, endDate);

      if (activities.length === 0) {
        setError('No activities found in the last 90 days. Import some data first.');
        setLoading(false);
        return;
      }

      const prompt = buildPrompt(activities);

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`API error ${response.status}: ${body}`);
      }

      const data = await response.json();
      const text = data.content?.[0]?.text || '';
      const parsed = parseResponse(text);

      if (parsed.length === 0) {
        setError('Could not parse the response. Please try again.');
      } else {
        setSections(parsed);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <TopBar title="Insights" />
      <div className="p-6 space-y-5">
        {/* API Key Setup */}
        {!apiKey ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <KeyRound className="size-4 text-[var(--atlas-sky)]" />
                Setup Required
              </CardTitle>
              <CardDescription>
                Insights uses Claude to analyze your training data. You need an Anthropic API key to get started.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>1. Go to <span className="font-mono text-foreground">console.anthropic.com</span> and create an account</p>
                <p>2. Navigate to API Keys and generate a new key</p>
                <p>3. Paste it below -- it is stored only in your browser&apos;s localStorage</p>
              </div>
              <div className="flex gap-2">
                <Input
                  type="password"
                  placeholder="sk-ant-..."
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="font-mono text-sm"
                />
                <Button onClick={saveKey}>Save Key</Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Key Management + Generate */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex-1 flex items-center gap-2">
                    <KeyRound className="size-4 text-muted-foreground shrink-0" />
                    <Input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      className="font-mono text-sm max-w-xs"
                    />
                    <Button variant="outline" size="sm" onClick={saveKey}>
                      Update
                    </Button>
                  </div>
                  <Button onClick={generateInsights} disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Generate Insights
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Error */}
            {error && (
              <Card className="border-destructive/50">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="size-4 mt-0.5 shrink-0" />
                    <p className="text-sm">{error}</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Loading state */}
            {loading && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {['Fitness Narrative', 'Recovery Signals', 'Performance Observations', 'One Thing'].map((title) => (
                  <Card key={title}>
                    <CardHeader>
                      <CardTitle className="text-sm">{title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded animate-pulse w-full" />
                        <div className="h-3 bg-muted rounded animate-pulse w-4/5" />
                        <div className="h-3 bg-muted rounded animate-pulse w-3/5" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Insight Cards */}
            {!loading && sections.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sections.map((section) => (
                  <Card key={section.title}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-sm">
                        <section.icon className="size-4" style={{ color: section.color }} />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!loading && sections.length === 0 && !error && (
              <div className="text-center py-16 text-muted-foreground">
                <Sparkles className="size-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Click &quot;Generate Insights&quot; to analyze your last 90 days of training</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
