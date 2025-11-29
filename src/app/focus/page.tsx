"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Play, Pause, SkipForward, Timer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string;
  category: string;
  status: string;
}

export default function FocusPage() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [isWorking, setIsWorking] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetchTasks();
    }
  }, [session]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWorking) {
      interval = setInterval(() => {
        setTimeElapsed((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isWorking]);

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem("bearer_token");
      const response = await fetch("/api/tasks?status=in_progress&archived=false", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          // Fetch upcoming tasks if no in-progress tasks
          const upcomingResponse = await fetch("/api/tasks?status=upcoming&archived=false", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (upcomingResponse.ok) {
            const upcomingData = await upcomingResponse.json();
            setTasks(upcomingData);
          }
        } else {
          setTasks(data);
        }
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const handleComplete = async () => {
    if (currentTask) {
      try {
        const token = localStorage.getItem("bearer_token");
        const response = await fetch(`/api/tasks/${currentTask.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status: "completed" }),
        });

        if (response.ok) {
          toast.success("Task completed! 🎉");
          setIsWorking(false);
          setTimeElapsed(0);
          
          // Move to next task
          if (currentTaskIndex < tasks.length - 1) {
            setCurrentTaskIndex((prev) => prev + 1);
          } else {
            // No more tasks
            setTasks([]);
            setCurrentTaskIndex(0);
          }
          fetchTasks();
        }
      } catch (error) {
        console.error("Failed to complete task:", error);
        toast.error("Failed to complete task");
      }
    }
  };

  const handleSkip = () => {
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex((prev) => prev + 1);
      setIsWorking(false);
      setTimeElapsed(0);
    } else {
      toast.info("No more tasks to focus on");
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const currentTask = tasks[currentTaskIndex];

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900">
      <div className="container mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.push("/dashboard")} className="mb-8">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>

        {!currentTask ? (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-16 text-center">
              <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">All caught up!</h2>
              <p className="text-muted-foreground mb-6">
                You have no tasks to focus on right now. Great job!
              </p>
              <Button onClick={() => router.push("/dashboard")}>
                Return to Dashboard
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Timer Card */}
            <Card className="text-center">
              <CardContent className="p-12">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-4">
                  <Timer className="h-5 w-5" />
                  <span className="text-sm">Focus Session</span>
                </div>
                <div className="text-6xl font-bold mb-8 font-mono">
                  {formatTime(timeElapsed)}
                </div>
                <div className="flex items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => setIsWorking(!isWorking)}
                    className="gap-2"
                  >
                    {isWorking ? (
                      <>
                        <Pause className="h-5 w-5" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleComplete}
                    className="gap-2"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Complete
                  </Button>
                  <Button
                    size="lg"
                    variant="ghost"
                    onClick={handleSkip}
                    className="gap-2"
                  >
                    <SkipForward className="h-5 w-5" />
                    Skip
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current Task Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-3xl">{currentTask.title}</CardTitle>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      currentTask.priority === "high"
                        ? "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                        : currentTask.priority === "medium"
                        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400"
                        : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    }`}>
                      {currentTask.priority}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      {currentTask.category}
                    </span>
                  </div>
                </div>
                <CardDescription className="text-base">
                  Due: {format(new Date(currentTask.dueDate), "MMMM dd, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentTask.description && (
                  <p className="text-lg text-muted-foreground leading-relaxed">
                    {currentTask.description}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Task Queue */}
            {tasks.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Up Next ({tasks.length - currentTaskIndex - 1} tasks)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tasks.slice(currentTaskIndex + 1, currentTaskIndex + 4).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <span className="font-medium">{task.title}</span>
                        <span className="text-sm text-muted-foreground">
                          {task.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
