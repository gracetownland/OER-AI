import Header from "@/components/Header";
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
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      {/* Main Content */}
      <main className="container mx-auto flex-1 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-5xl font-bold text-gray-900">
              BCcampus Textbook Catalogue
            </h2>
            <p className="text-lg text-gray-600">
              Select a textbook to get started
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mx-auto mb-12 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Title or Author"
              className="h-12 bg-input border pl-10 text-base shadow-sm"
            />
          </div>

          {/* Textbook Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {textbooks.map((textbook) => (
              <Card
                key={textbook.id}
                className="flex flex-col items-start p-[10px] transition-shadow hover:shadow-lg"
              >
                <CardHeader className="flex-1 p-0 w-full">
                  <CardTitle className="line-clamp-3 text-base leading-tight text-left">
                    {textbook.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 w-full">
                  <p className="truncate text-sm text-primary text-left">
                    By {
                      (() => {
                        const authors = textbook.author;
                        if (authors.length === 1) return authors[0];
                        if (authors.length === 2) return `${authors[0]} & ${authors[1]}`;
                        return authors.slice(0, -1).join(", ") + " & " + authors[authors.length - 1];
                      })()
                    }
                  </p>
                </CardContent>
                <CardContent className="p-0 w-full">
                  <p className="px-[10px] py-[5px] bg-primary text-primary-foreground border rounded-xl w-fit text-left">{textbook.category}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
