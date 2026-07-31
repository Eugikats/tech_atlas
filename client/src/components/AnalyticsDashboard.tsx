import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Users, 
  Eye, 
  Globe, 
  TrendingUp, 
  Clock,
  RefreshCw,
  Mail
} from 'lucide-react';
import { toast } from 'sonner';

type Period = '7d' | '30d' | '90d';

export function AnalyticsDashboard() {
  const [period, setPeriod] = useState<Period>('30d');
  const [emailTest, setEmailTest] = useState('');

  const analyticsQuery = trpc.admin.getAnalytics.useQuery({ period });
  const topPagesQuery = trpc.admin.getTopPages.useQuery({ period });
  const sendTestEmailMutation = trpc.admin.sendTestEmail.useMutation();

  const handleSendTestEmail = async () => {
    if (!emailTest) return;
    
    try {
      await sendTestEmailMutation.mutateAsync({ 
        to: emailTest, 
        type: 'welcome' 
      });
      toast.success('Test email sent successfully!');
      setEmailTest('');
    } catch (error) {
      toast.error('Failed to send test email');
    }
  };

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    return new Intl.NumberFormat().format(num);
  };

  const periodLabels = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days', 
    '90d': 'Last 90 days'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Website performance and user engagement metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              analyticsQuery.refetch();
              topPagesQuery.refetch();
            }}
            disabled={analyticsQuery.isLoading}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs value={period} onValueChange={(value) => setPeriod(value as Period)}>
        <TabsList>
          <TabsTrigger value="7d">7 Days</TabsTrigger>
          <TabsTrigger value="30d">30 Days</TabsTrigger>
          <TabsTrigger value="90d">90 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Page Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsQuery.isLoading ? '...' : formatNumber(analyticsQuery.data?.pageviews)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {periodLabels[period]}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Visitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsQuery.isLoading ? '...' : formatNumber(analyticsQuery.data?.visitors)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {periodLabels[period]}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bounce Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsQuery.isLoading 
                    ? '...' 
                    : analyticsQuery.data?.bounceRate 
                      ? `${Math.round(analyticsQuery.data.bounceRate * 100)}%`
                      : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Lower is better
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Session</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analyticsQuery.isLoading 
                    ? '...' 
                    : analyticsQuery.data?.avgSessionDuration
                      ? `${Math.round(analyticsQuery.data.avgSessionDuration / 60)}m`
                      : 'N/A'
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Duration in minutes
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Top Pages */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Top Pages
                </CardTitle>
                <CardDescription>
                  Most visited pages in the {periodLabels[period].toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {topPagesQuery.isLoading ? (
                  <div className="space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-8 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : topPagesQuery.data && topPagesQuery.data.length > 0 ? (
                  <div className="space-y-2">
                    {topPagesQuery.data.slice(0, 10).map((page: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {page.x || page.url || 'Unknown'}
                          </p>
                        </div>
                        <Badge variant="secondary">
                          {formatNumber(page.y || page.views || 0)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Email Testing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Testing
                </CardTitle>
                <CardDescription>
                  Test email notifications and templates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Test Email Address</label>
                  <input
                    type="email"
                    value={emailTest}
                    onChange={(e) => setEmailTest(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full px-3 py-2 border border-input rounded-md text-sm"
                  />
                </div>
                <Button 
                  onClick={handleSendTestEmail}
                  disabled={!emailTest || sendTestEmailMutation.isPending}
                  className="w-full"
                >
                  {sendTestEmailMutation.isPending ? 'Sending...' : 'Send Welcome Email'}
                </Button>
                {sendTestEmailMutation.isSuccess && (
                  <p className="text-sm text-green-600">Email sent successfully!</p>
                )}
                {sendTestEmailMutation.isError && (
                  <p className="text-sm text-red-600">Failed to send email</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
