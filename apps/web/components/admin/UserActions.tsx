"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type UserActionsProps = {
  userId: string;
  isActive?: boolean | null;
};

export default function UserActions({ userId, isActive }: UserActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const runAction = async (action: "reset" | "deactivate") => {
    const label =
      action === "reset"
        ? "Reset this user's balance to the default amount?"
        : "Deactivate this user?";
    if (!window.confirm(label)) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/${action === "reset" ? "reset-balance" : "deactivate"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: `Admin ${action}` }),
      });

      if (!res.ok) {
        toast.error("Action failed");
        return;
      }

      toast.success(action === "reset" ? "Balance reset" : "User deactivated");
      router.refresh();
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => runAction("reset")}
        disabled={loading}
      >
        Reset Balance
      </Button>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => runAction("deactivate")}
        disabled={loading || isActive === false}
      >
        Deactivate
      </Button>
    </div>
  );
}
