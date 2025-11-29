"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskCard } from "@/components/TaskCard";
import { AddTaskDialog } from "@/components/AddTaskDialog";
import { EditTaskDialog } from "@/components/EditTaskDialog";
import { ProductivityChart } from "@/components/ProductivityChart";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { 
  LogOut, 
  Settings, 
  Focus, 
  Archive as ArchiveIcon,
  Download,
  Moon,
  Sun,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isFuture, isPast } from "date-fns";

interface Task {
  id: number;
  userId: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string;
  startDate: string | null;
  category: string;
  status: string;
  archived: boolean;
  googleCalendarEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  upcoming: number;
  overdue: number;
  completionRate: number;
}

export default function DashboardPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchTasks();
      fetchStats();
    }
  }, [session]);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle("dark");
    setDarkMode(!darkMode);
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/tasks?archived=false", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
      toast.error("Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/tasks/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handleAddTask = async (taskData: any) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      });

      if (response.ok) {
        toast.success("Task created successfully");
        fetchTasks();
        fetchStats();
      } else {
        toast.error("Failed to create task");
      }
    } catch (error) {
      console.error("Failed to add task:", error);
      toast.error("Failed to create task");
    }
  };

  const handleUpdateTask = async (id: number, updates: any) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        toast.success("Task updated successfully");
        fetchTasks();
        fetchStats();
      } else {
        toast.error("Failed to update task");
      }
    } catch (error) {
      console.error("Failed to update task:", error);
      toast.error("Failed to update task");
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/tasks?id=${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success("Task deleted successfully");
        fetchTasks();
        fetchStats();
      } else {
        toast.error("Failed to delete task");
      }
    } catch (error) {
      console.error("Failed to delete task:", error);
      toast.error("Failed to delete task");
    }
  };

  const handleStatusChange = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch(`/api/tasks/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success("Task status updated");
        fetchTasks();
        fetchStats();
      } else {
        toast.error("Failed to update status");
      }
    } catch (error) {
      console.error("Failed to update status:", error);
      toast.error("Failed to update status");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleSignOut = async () => {
    const token = localStorage.getItem("bearer_token");
    await authClient.signOut({
      fetchOptions: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    localStorage.removeItem("bearer_token");
    router.push("/");
  };

  const exportToCSV = () => {
    const csv = [
      ["Title", "Description", "Priority", "Category", "Status", "Due Date", "Created At"],
      ...tasks.map(task => [
        task.title,
        task.description || "",
        task.priority,
        task.category,
        task.status,
        format(new Date(task.dueDate), "yyyy-MM-dd"),
        format(new Date(task.createdAt), "yyyy-MM-dd")
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tasks-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    toast.success("Tasks exported successfully");
  };

  // Filter tasks
  const todayTasks = tasks.filter(task => 
    isToday(new Date(task.dueDate)) && task.status !== "completed"
  );
  const overdueTasks = tasks.filter(task => 
    (task.status === "overdue" || (isPast(new Date(task.dueDate)) && task.status !== "completed" && !isToday(new Date(task.dueDate))))
  );
  const inProgressTasks = tasks.filter(task => task.status === "in_progress");
  const upcomingTasks = tasks.filter(task => 
    isFuture(new Date(task.dueDate)) && task.status === "upcoming"
  );

  if (isPending || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TaskFlow Pro
            </h1>
            <p className="text-sm text-muted-foreground">
              Welcome back, {session?.user?.name || session?.user?.email}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={toggleDarkMode}>
              {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/focus")}>
              <Focus className="h-4 w-4 mr-2" />
              Focus Mode
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/archive")}>
              <ArchiveIcon className="h-4 w-4 mr-2" />
              Archive
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats?.total || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats?.completed || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">{stats?.inProgress || 0}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats?.overdue || 0}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Tasks</h2>
              <AddTaskDialog onAdd={handleAddTask} />
            </div>

            <Tabs defaultValue="today" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="today">
                  Today ({todayTasks.length})
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  Overdue ({overdueTasks.length})
                </TabsTrigger>
                <TabsTrigger value="progress">
                  In Progress ({inProgressTasks.length})
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  Upcoming ({upcomingTasks.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="today" className="space-y-4">
                {todayTasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No tasks due today</p>
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={todayTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {todayTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>

              <TabsContent value="overdue" className="space-y-4">
                {overdueTasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No overdue tasks</p>
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={overdueTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {overdueTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>

              <TabsContent value="progress" className="space-y-4">
                {inProgressTasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No tasks in progress</p>
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={inProgressTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {inProgressTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="space-y-4">
                {upcomingTasks.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-muted-foreground">No upcoming tasks</p>
                    </CardContent>
                  </Card>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={upcomingTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {upcomingTasks.map(task => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onEdit={setEditingTask}
                          onDelete={handleDeleteTask}
                          onStatusChange={handleStatusChange}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {stats && <ProductivityChart stats={stats} />}
          </div>
        </div>
      </div>

      <EditTaskDialog
        task={editingTask}
        open={!!editingTask}
        onClose={() => setEditingTask(null)}
        onUpdate={handleUpdateTask}
      />
    </div>
  );
}
