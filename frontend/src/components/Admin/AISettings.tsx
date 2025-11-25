import { useState } from "react";
import { Save, Bot } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export default function AISettings() {
  const [tokenLimit, setTokenLimit] = useState(1000);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      // Here we would typically show a success toast
      console.log("Token limit saved:", isUnlimited ? "Unlimited" : tokenLimit);
    }, 1000);
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">AI Settings</h2>
        <p className="text-gray-500 mt-1">
          Configure global AI settings and limits.
        </p>
      </div>

      <Card className="border-gray-200 shadow-sm max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-[#2c5f7c]" />
            Token Limits
          </CardTitle>
          <CardDescription>
            Set the daily token usage limit for standard users.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="token-limit">Daily Token Limit</Label>
              <div className="flex items-center space-x-2">
                <Switch
                  id="unlimited-mode"
                  checked={isUnlimited}
                  onCheckedChange={setIsUnlimited}
                />
                <Label
                  htmlFor="unlimited-mode"
                  className="font-normal cursor-pointer"
                >
                  No Limit
                </Label>
              </div>
            </div>
            <Input
              id="token-limit"
              type="number"
              value={tokenLimit}
              onChange={(e) => setTokenLimit(Number(e.target.value))}
              placeholder="Enter token limit (e.g. 1000)"
              disabled={isUnlimited}
            />
            <p className="text-xs text-gray-500">
              This limit applies to all non-admin users. Resets daily at
              midnight UTC.
            </p>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#2c5f7c] hover:bg-[#234d63]"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
