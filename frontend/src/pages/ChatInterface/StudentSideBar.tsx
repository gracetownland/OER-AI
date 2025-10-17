import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type StudentSideBarProps = {
  textbookTitle: string;
  textbookAuthor: string;
};

export default function StudentSideBar({
  textbookTitle,
  textbookAuthor,
}: StudentSideBarProps) {
  return (
    <aside className="fixed left-0 p-[10px] h-screen w-64 flex-shrink-0 border bg-muted overflow-auto px-4">
      {/* Textbook Card */}
      <Card className="mb-6">
        <CardContent>
          <h3 className="font-semibold text-sm">{textbookTitle}</h3>
          <p className="text-xs text-gray-600">By {textbookAuthor}</p>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <nav className="space-y-2 mb-6">
        <Button variant={"link"} className="cursor-pointer w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
          FAQ Cache
        </Button>
        <Button variant={"link"} className="cursor-pointer w-full justify-start px-3 py-2 text-sm text-muted-foreground hover:text-foreground rounded-md transition-colors">
          Practice Material
        </Button>
      </nav>

      {/* Tutor Section */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-semibold text-sm px-3">Tutor</h4>
      </div>
    </aside>
  );
}
