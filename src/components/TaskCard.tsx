"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Edit, Trash2, Play, CheckCircle2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string;
  startDate: string | null;
  category: string;
  status: string;
  googleCalendarEventId: string | null;
}

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
  onStatusChange: (id: number, status: string) => void;
}

const priorityColors = {
  low: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  medium: "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  high: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const statusColors = {
  upcoming: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  overdue: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export function TaskCard({ task, onEdit, onDelete, onStatusChange }: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.status === 'overdue' || (new Date(task.dueDate) < new Date() && task.status !== 'completed');

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`group hover:shadow-lg transition-all ${isOverdue ? 'border-red-500 border-2' : ''} ${isDragging ? 'shadow-2xl' : ''}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0" {...attributes} {...listeners}>
            <CardTitle className="text-lg cursor-grab active:cursor-grabbing">
              {task.title}
            </CardTitle>
            {task.description && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {task.status !== 'in_progress' && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'in_progress')}>
                  <Play className="h-4 w-4 mr-2" />
                  Start Task
                </DropdownMenuItem>
              )}
              {task.status !== 'completed' && (
                <DropdownMenuItem onClick={() => onStatusChange(task.id, 'completed')}>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Mark Complete
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 mb-3">
          <Badge variant="outline" className={priorityColors[task.priority as keyof typeof priorityColors]}>
            {task.priority}
          </Badge>
          <Badge variant="outline" className={statusColors[task.status as keyof typeof statusColors]}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant="outline">
            {task.category}
          </Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(new Date(task.dueDate), 'MMM dd, yyyy')}
          </div>
          {task.googleCalendarEventId && (
            <Badge variant="secondary" className="text-xs">
              📅 Synced
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
