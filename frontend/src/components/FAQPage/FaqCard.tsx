import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { Button } from "../ui/button";

interface FaqCardProps {
  question: string;
  count: number;
  onClick?: () => void;
}

export function FaqCard({ question, count, onClick }: FaqCardProps) {
  return (
    <Card
      className="gap-1 sm:gap-6 p-[10px] flex-col justify-between cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] bg-muted/30"
      onClick={onClick}
    >
      <CardContent
        className="p-0 max-h-2.5 sm:max-h-none"
        style={{ minHeight: `calc(1em * 1.25 * ${window.innerWidth < 768 ? 2 : 3})` }}      >
        <h3 className="font-semibold text-base leading-tight mb-auto">
          {question}
        </h3>
      </CardContent>

      <CardFooter className="p-0">
        <div className="flex w-full items-center justify-between">
          <p className="px-4 border rounded-lg text-sm font-medium">
            {count}
          </p>
          {/* report button */}
          <Button
            variant={"link"}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
