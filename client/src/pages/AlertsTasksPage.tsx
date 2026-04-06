/**
 * AlertsTasksPage.tsx
 * Unified Alerts & Tasks Management
 * Notifications, task tracking, and team coordination
 */
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  CheckCircle,
  AlertCircle,
  Clock,
  AlertTriangle,
  Zap,
  Plus,
  Filter,
  CheckCheck,
} from "lucide-react";

// Alert Status Badge
function AlertStatusBadge({ severity }: { severity: string }) {
  const variants: Record<string, { bg: string; text: string; icon: any }> = {
    info: { bg: "bg-blue-100", text: "text-blue-700", icon: Bell },
    warning: { bg: "bg-yellow-100", text: "text-yellow-700", icon: AlertTriangle },
    critical: { bg: "bg-red-100", text: "text-red-700", icon: AlertCircle },
  };

  const variant = variants[severity] || variants.info;
  const Icon = variant.icon;

  return (
    <Badge className={`${variant.bg} ${variant.text} gap-1`}>
      <Icon className="w-3 h-3" />
      {severity}
    </Badge>
  );
}

// Task Priority Badge
function TaskPriorityBadge({ priority }: { priority: string }) {
  const variants: Record<string, string> = {
    low: "bg-green-100 text-green-700",
    medium: "bg-blue-100 text-blue-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-red-100 text-red-700",
  };

  return (
    <Badge className={variants[priority] || variants.medium}>
      {priority}
    </Badge>
  );
}

// Task Status Badge
function TaskStatusBadge({ status }: { status: string }) {
  const variants: Record<string, string> = {
    pending: "bg-gray-100 text-gray-700",
    in_progress: "bg-blue-100 text-blue-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-700",
  };

  return (
    <Badge className={variants[status] || variants.pending}>
      {status.replace("_", " ")}
    </Badge>
  );
}

// Alerts Tab
function AlertsTab() {
  const { data: alerts } = trpc.alertsAndTasks.getMyAlerts.useQuery({
    limit: 50,
  });
  const { data: unreadCount } = trpc.alertsAndTasks.getUnreadCount.useQuery();
  const markAsRead = trpc.alertsAndTasks.markAsRead.useMutation();

  const unreadAlerts = useMemo(() => {
    return alerts?.filter((a: any) => !a.isRead) || [];
  }, [alerts]);

  const readAlerts = useMemo(() => {
    return alerts?.filter((a: any) => a.isRead) || [];
  }, [alerts]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Unread Alerts</p>
                <p className="text-2xl font-bold text-red-600">{unreadCount || 0}</p>
              </div>
              <Bell className="w-8 h-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-orange-600">
                  {alerts?.filter((a: any) => a.severity === "critical").length || 0}
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold text-blue-600">{alerts?.length || 0}</p>
              </div>
              <Zap className="w-8 h-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Unread Alerts */}
      {unreadAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Unread Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {unreadAlerts.map((alert: any) => (
              <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertStatusBadge severity={alert.severity} />
                    <p className="font-semibold text-sm">{alert.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => markAsRead.mutate({ id: alert.id })}
                  className="ml-2"
                >
                  <CheckCheck className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Read Alerts */}
      {readAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Read Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {readAlerts.slice(0, 10).map((alert: any) => (
              <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg opacity-60">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertStatusBadge severity={alert.severity} />
                    <p className="font-semibold text-sm">{alert.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{alert.message}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Tasks Tab
function TasksTab() {
  const { data: tasks } = trpc.alertsAndTasks.getMyTasks.useQuery({
    limit: 100,
  });
  const { data: stats } = trpc.alertsAndTasks.getStats.useQuery({});
  const updateStatus = trpc.alertsAndTasks.updateStatus.useMutation();
  const updateProgress = trpc.alertsAndTasks.updateProgress.useMutation();

  const pendingTasks = useMemo(() => {
    return tasks?.filter((t: any) => t.status === "pending") || [];
  }, [tasks]);

  const inProgressTasks = useMemo(() => {
    return tasks?.filter((t: any) => t.status === "in_progress") || [];
  }, [tasks]);

  const completedTasks = useMemo(() => {
    return tasks?.filter((t: any) => t.status === "completed") || [];
  }, [tasks]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="text-xl font-bold">{stats?.total || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-xl font-bold text-orange-600">{stats?.pending || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">In Progress</p>
            <p className="text-xl font-bold text-blue-600">{stats?.inProgress || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-xl font-bold text-green-600">{stats?.completed || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-xs text-muted-foreground">Overdue</p>
            <p className="text-xl font-bold text-red-600">{stats?.overdue || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Tasks */}
      {pendingTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingTasks.map((task: any) => (
              <div key={task.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TaskPriorityBadge priority={task.priority} />
                    <p className="font-semibold text-sm">{task.title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.description}</p>
                  {task.dueDate && (
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: task.id, status: "in_progress" })}
                  className="ml-2"
                >
                  Start
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* In Progress Tasks */}
      {inProgressTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">In Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {inProgressTasks.map((task: any) => (
              <div key={task.id} className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <TaskStatusBadge status={task.status} />
                    <p className="font-semibold text-sm">{task.title}</p>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${task.progress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{task.progress || 0}% complete</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => updateStatus.mutate({ id: task.id, status: "completed" })}
                  className="ml-2"
                >
                  Complete
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Completed Tasks */}
      {completedTasks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Completed ({completedTasks.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {completedTasks.slice(0, 5).map((task: any) => (
              <div key={task.id} className="flex items-start justify-between p-3 border rounded-lg opacity-60">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <p className="font-semibold text-sm">{task.title}</p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Main Component
export default function AlertsTasksPage() {
  const [activeTab, setActiveTab] = useState("alerts");

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Alerts & Tasks</h1>
          <p className="text-muted-foreground">Team notifications and task management</p>
        </div>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          New Task
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-2">
            <CheckCircle className="w-4 h-4" />
            Tasks
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          <AlertsTab />
        </TabsContent>

        <TabsContent value="tasks" className="space-y-4">
          <TasksTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
