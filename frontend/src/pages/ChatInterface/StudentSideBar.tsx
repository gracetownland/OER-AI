import { Card, CardContent } from "@/components/ui/card";

type StudentSideBarProps = {
  textbookTitle: string;
  textbookAuthor: string;
};

export default function StudentSideBar({
  textbookTitle,
  textbookAuthor,
}: StudentSideBarProps) {
  return (
    <aside className="fixed left-0 p-[10px] h-screen w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50 overflow-auto px-4">
      {/* Textbook Card */}
      <Card className="mb-6">
        <CardContent>
          <h3 className="font-semibold text-sm">{textbookTitle}</h3>
          <p className="text-xs text-gray-600">By {textbookAuthor}</p>
        </CardContent>
      </Card>

      {/* Menu Items */}
      <nav className="space-y-2 mb-6">
        <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
          FAQ Cache
        </button>
        <button className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors">
          Practice Material
        </button>
      </nav>

      {/* Tutor Section */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="font-semibold text-sm px-3">Tutor</h4>
      </div>
    </aside>
  );
}
