import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";  


export default function HomePage() {
  const textbooks = [
    {
      id: 1,
      title: "Calculus: Volume 3",
      author: ["OpenStax"],
      category: "Mathematics",
    },
    {
      id: 2,
      title: "Elementary Differential Equations with Boundary Value Problems",
      author: ["William F. Trench"],
      category: "Mathematics",
    },
    {
      id: 3,
      title: "Building a Competitive First Nation Investment Climate",
      author: ["Tulo Centre of Indigenous Economics"],
      category: "Mathematics",
    },
    {
      id: 4,
      title: "Financial Strategy for Public Managers",
      author: ["Sharon Kioko", "Justin Marlowe"],
      category: "Mathematics",
    },
    {
      id: 5,
      title:
        "Guideline for Improving the Effectiveness of Boards of Directors of Nonprofit Organizations",
      author: ["Vic Murray", "Yvonne Harrison"],
      category: "Mathematics",
    },
    {
      id: 6,
      title:
        "Algorithms and Data Structures with Applications to Graphics and Geometry",
      author: ["William Shakespeare"],
      category: "Mathematics",
    },
    {
      id: 7,
      title: "Foundations of Mathematics: Calculus 3",
      author: ["William Shakespeare"],
      category: "Mathematics",
    },
    {
      id: 8,
      title: "Professional Web Accessibility Auditing Made Easy",
      author: ["William Shakespeare"],
      category: "Mathematics",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#2c5f7c] to-[#3d7a9a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#1e3a4c]/50 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <h1 className="text-xl font-semibold text-white">OpenED AI</h1>
          <Select defaultValue="student">
            <SelectTrigger className="w-[180px] border-white/30 bg-transparent text-white hover:bg-white/10">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-5xl font-bold text-white">
              BCcampus Textbook Catalogue
            </h2>
            <p className="text-lg text-white/90">
              Select a textbook to get started
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mx-auto mb-12 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Title or Author"
              className="h-12 bg-white pl-10 text-base shadow-sm"
            />
          </div>

          {/* Textbook Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {textbooks.map((textbook) => (
              <Card
                key={textbook.id}
                className="transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <CardTitle className="text-base leading-tight">
                    {textbook.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-blue-600">By {textbook.author}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
