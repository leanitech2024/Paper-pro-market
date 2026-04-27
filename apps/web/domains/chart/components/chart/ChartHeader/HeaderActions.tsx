import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Camera, Maximize, Minimize2, Undo2, Redo2 } from 'lucide-react';

interface HeaderActionsProps {
  isFullscreen: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onScreenshot?: () => void;
  onMaximize?: () => void;
}

export function HeaderActions({
  isFullscreen,
  onUndo,
  onRedo,
  onScreenshot,
  onMaximize
}: HeaderActionsProps) {
  return (
    <div className="flex items-center gap-1 shrink-0 ml-auto">
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onUndo}>
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onRedo}>
        <Redo2 className="h-4 w-4" />
      </Button>
      <Separator orientation="vertical" className="h-4 bg-border/50 mx-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onScreenshot}>
        <Camera className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100" onClick={onMaximize}>
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
      </Button>
    </div>
  );
}
