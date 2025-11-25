import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import {
  BarChart3,
  MessageSquare,
  FileVideo,
  CheckCircle2,
  PlayCircle,
  FileAudio,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Mock data generator (moved from previous implementation)
const getMockTextbook = (id: string) => ({
  id,
  title: "Introduction to Computer Science",
  author: "Dr. Alan Turing",
  status: "Active",
  users: 1250,
  questions: 3420,
});

export default function TextbookDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"analytics" | "faq" | "status">(
    "analytics"
  );
  const [textbook, setTextbook] = useState<any>(null);

  useEffect(() => {
    // Simulate API fetch
    if (id) {
      setTextbook(getMockTextbook(id));
    }
  }, [id]);

  if (!textbook) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#2c5f7c] to-[#3d7a9a] text-white h-[70px] flex items-center px-6 shadow-md z-10 justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="h-6 w-6" />
          <h1 className="text-xl font-semibold">OpenED AI Admin</h1>
        </div>
        <Button
          variant="ghost"
          className="text-white hover:bg-white/10"
          onClick={() => navigate("/admin/dashboard")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 line-clamp-2">
              {textbook.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{textbook.author}</p>
            <Badge
              variant={textbook.status === "Active" ? "default" : "secondary"}
              className={`mt-3 ${
                textbook.status === "Active"
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-100"
              }`}
            >
              {textbook.status}
            </Badge>
          </div>

          <nav className="p-4 space-y-1">
            <Button
              variant={activeView === "analytics" ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                activeView === "analytics"
                  ? "bg-[#2c5f7c]/10 text-[#2c5f7c] font-medium"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveView("analytics")}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </Button>
            <Button
              variant={activeView === "faq" ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                activeView === "faq"
                  ? "bg-[#2c5f7c]/10 text-[#2c5f7c] font-medium"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveView("faq")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              FAQ & User Prompts
            </Button>
            <Button
              variant={activeView === "status" ? "secondary" : "ghost"}
              className={`w-full justify-start ${
                activeView === "status"
                  ? "bg-[#2c5f7c]/10 text-[#2c5f7c] font-medium"
                  : "text-gray-600"
              }`}
              onClick={() => setActiveView("status")}
            >
              <FileVideo className="mr-2 h-4 w-4" />
              Textbook Status & Media
            </Button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50">
          <div className="max-w-5xl mx-auto animate-in fade-in duration-500">
            {activeView === "analytics" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Analytics Overview
                  </h2>
                  <p className="text-gray-500">
                    Usage statistics and engagement metrics.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-blue-50 border-blue-100">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-blue-700 mb-2">
                        <BarChart3 className="h-5 w-5" />
                        <span className="font-medium">Total Views</span>
                      </div>
                      <p className="text-4xl font-bold text-blue-900">
                        {Math.floor(Math.random() * 5000) + 1000}
                      </p>
                      <p className="text-sm text-blue-600 mt-2">
                        +12% from last month
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-purple-50 border-purple-100">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-2 text-purple-700 mb-2">
                        <MessageSquare className="h-5 w-5" />
                        <span className="font-medium">Questions Asked</span>
                      </div>
                      <p className="text-4xl font-bold text-purple-900">
                        {textbook.questions}
                      </p>
                      <p className="text-sm text-purple-600 mt-2">
                        Avg. 5 questions per user
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Popular Topics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        "Chapter 1 Summary",
                        "Key Concepts",
                        "Practice Problems",
                        "Exam Prep",
                        "Historical Context",
                      ].map((topic, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                        >
                          <span className="font-medium text-gray-700">
                            {topic}
                          </span>
                          <div className="flex items-center gap-4">
                            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2c5f7c]"
                                style={{ width: `${Math.random() * 60 + 40}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-500 w-20 text-right">
                              {Math.floor(Math.random() * 100)} queries
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeView === "faq" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    FAQ & User Prompts
                  </h2>
                  <p className="text-gray-500">
                    Recent questions asked by students.
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    "Can you explain the concept of recursion?",
                    "What is the main argument in Chapter 3 regarding algorithms?",
                    "How does this relate to the Turing Test?",
                    "Summarize the introduction.",
                    "Give me 5 practice questions for the midterm.",
                    "Explain Big O notation simply.",
                  ].map((q, i) => (
                    <Card key={i} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <p className="text-lg font-medium text-gray-900">
                              "{q}"
                            </p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                variant="outline"
                                className="text-gray-500"
                              >
                                Chapter {Math.floor(Math.random() * 10) + 1}
                              </Badge>
                              <span className="text-sm text-gray-400">
                                Asked {Math.floor(Math.random() * 24)} hours ago
                              </span>
                            </div>
                          </div>
                          <Button variant="outline" size="sm">
                            View Context
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {activeView === "status" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Textbook Status & Media
                  </h2>
                  <p className="text-gray-500">
                    Ingestion status and linked materials.
                  </p>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Ingestion Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-100 rounded-lg">
                      <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-bold text-green-900 text-lg">
                          Fully Ingested
                        </p>
                        <p className="text-green-700">
                          All 12 chapters have been processed and indexed
                          successfully.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Associated Media
                  </h3>
                  <div className="grid gap-4">
                    {[
                      {
                        type: "video",
                        title: "Lecture 1: Introduction to CS",
                        duration: "45:00",
                        size: "1.2 GB",
                      },
                      {
                        type: "audio",
                        title: "Podcast: The History of Computing",
                        duration: "15:30",
                        size: "24 MB",
                      },
                      {
                        type: "video",
                        title: "Chapter 2: Algorithms Walkthrough",
                        duration: "22:15",
                        size: "450 MB",
                      },
                      {
                        type: "video",
                        title: "Lab Session 1 Recording",
                        duration: "55:00",
                        size: "1.5 GB",
                      },
                    ].map((media, i) => (
                      <Card key={i}>
                        <CardContent className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                                media.type === "video"
                                  ? "bg-red-100"
                                  : "bg-blue-100"
                              }`}
                            >
                              {media.type === "video" ? (
                                <PlayCircle
                                  className={`h-6 w-6 ${
                                    media.type === "video"
                                      ? "text-red-600"
                                      : "text-blue-600"
                                  }`}
                                />
                              ) : (
                                <FileAudio className="h-6 w-6 text-blue-600" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {media.title}
                              </p>
                              <p className="text-sm text-gray-500 capitalize">
                                {media.type} • {media.duration} • {media.size}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              Preview
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              Unlink
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
