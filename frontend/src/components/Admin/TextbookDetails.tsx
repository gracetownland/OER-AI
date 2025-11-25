import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  MessageSquare,
  CheckCircle2,
  PlayCircle,
  FileAudio,
} from "lucide-react";
import type { TextbookData } from "./TextbookManagement";

interface TextbookDetailsProps {
  textbook: TextbookData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function TextbookDetails({
  textbook,
  open,
  onOpenChange,
}: TextbookDetailsProps) {
  if (!textbook) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-2xl">{textbook.title}</SheetTitle>
          <SheetDescription className="text-base">
            {textbook.author}
          </SheetDescription>
          <div className="flex items-center gap-2 mt-2">
            <Badge
              variant={textbook.status === "Active" ? "default" : "secondary"}
              className={
                textbook.status === "Active"
                  ? "bg-green-100 text-green-700 hover:bg-green-100"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-100"
              }
            >
              {textbook.status}
            </Badge>
            <span className="text-sm text-gray-500">ID: {textbook.id}</span>
          </div>
        </SheetHeader>

        <Tabs defaultValue="analytics" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="faq">FAQ & Prompts</TabsTrigger>
            <TabsTrigger value="status">Status & Media</TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 mb-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className="font-medium text-sm">Total Views</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {Math.floor(Math.random() * 5000) + 1000}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                <div className="flex items-center gap-2 text-purple-700 mb-2">
                  <MessageSquare className="h-4 w-4" />
                  <span className="font-medium text-sm">Questions Asked</span>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {textbook.questions}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Popular Topics</h4>
              <div className="space-y-2">
                {[
                  "Chapter 1 Summary",
                  "Key Concepts",
                  "Practice Problems",
                  "Exam Prep",
                ].map((topic, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                  >
                    <span className="text-sm text-gray-700">{topic}</span>
                    <span className="text-xs font-medium text-gray-500">
                      {Math.floor(Math.random() * 100)} queries
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="faq" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">
                Recent User Questions
              </h4>
              <div className="space-y-3">
                {[
                  "Can you explain the concept of...",
                  "What is the main argument in Chapter 3?",
                  "How does this relate to...",
                  "Summarize the introduction.",
                ].map((q, i) => (
                  <div
                    key={i}
                    className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-gray-800 font-medium">"{q}"</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Asked {Math.floor(Math.random() * 24)} hours ago
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="status" className="space-y-6">
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Ingestion Status</h4>
              <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Fully Ingested</p>
                  <p className="text-sm text-green-700">
                    All chapters processed successfully
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">
                  Associated Media
                </h4>
                <div className="space-y-3">
                  {[
                    {
                      type: "video",
                      title: "Lecture 1: Introduction",
                      duration: "45:00",
                    },
                    {
                      type: "audio",
                      title: "Podcast Summary",
                      duration: "15:30",
                    },
                    {
                      type: "video",
                      title: "Chapter 2 Walkthrough",
                      duration: "22:15",
                    },
                  ].map((media, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {media.type === "video" ? (
                          <PlayCircle className="h-8 w-8 text-red-500 opacity-80" />
                        ) : (
                          <FileAudio className="h-8 w-8 text-blue-500 opacity-80" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {media.title}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {media.type} • {media.duration}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}

import { Button } from "@/components/ui/button";
