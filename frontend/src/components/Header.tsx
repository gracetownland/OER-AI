import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function Header() {
  return (
    <header className="z-50 h-[70px] fixed w-full border-b border-white/10 bg-gradient-to-r from-[#2c5f7c] to-[#3d7a9a]">
      <div className="container mx-auto flex items-center justify-between px-6 py-4">
        <h1 className="text-xl font-semibold text-white">OpenED AI</h1>
        <Select defaultValue="student">
          <SelectTrigger className="w-fit border-primary-foreground bg-transparent text-white  [&_svg:not([class*='text-'])]:text-primary-foreground hover:bg-white/10">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="student">Mode: Student</SelectItem>
            <SelectItem value="instructor">Mode: Instructor</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
