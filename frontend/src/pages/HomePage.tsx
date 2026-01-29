import HomePageHeader from "@/components/HomePageHeader";
import Footer from "@/components/Footer";
import TextbookCard from "@/components/HomePage/TextbookCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getWelcomeMessage } from "@/lib/welcomeMessage";
import type { Textbook } from "@/types/Textbook";
import { useAuthToken } from "@/providers/AuthProvider";

// Define a custom UUID type to avoid the crypto module import
type UUID = string;

type TextbookForCard = {
  id: UUID;
  title: string;
  author: string[];
  category: string;
  logo_url?: string;
};

type PaginationInfo = {
  limit: number;
  offset: number;
  total: number;
  hasMore: boolean;
};

export default function HomePage() {
  const [userSearch, setUserSearch] = useState<string>("");
  const [textbooks, setTextbooks] = useState<Textbook[]>([]);
  const [filteredBooks, setFilteredBooks] = useState<TextbookForCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Check if user has seen the welcome message
  useEffect(() => {
    try {
      const hasSeenWelcome = localStorage.getItem("hasSeenWelcome");
      if (!hasSeenWelcome) {
        setShowWelcome(true);
        localStorage.setItem("hasSeenWelcome", "true");
      }
    } catch (error) {
      console.error("Failed to access localStorage:", error);
    }
  }, []);

  const { token } = useAuthToken();

  // Parallel fetch for both welcome message and textbooks (faster initial load)
  useEffect(() => {
    const fetchInitialData = async () => {
      if (!token) return;

      const cacheKey = `textbooks_0`;
      const cacheTimeKey = `${cacheKey}_time`;
      const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

      // Check textbook cache first
      let cachedTextbooks = null;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        const cacheTime = sessionStorage.getItem(cacheTimeKey);
        if (cached && cacheTime && Date.now() - parseInt(cacheTime) < CACHE_TTL_MS) {
          cachedTextbooks = JSON.parse(cached);
          console.log("Loaded textbooks from cache");
        }
      } catch (cacheError) {
        console.warn("Cache read error:", cacheError);
      }

      // If we have cached textbooks, use them immediately
      if (cachedTextbooks) {
        setTextbooks(cachedTextbooks.textbooks || []);
        setPagination(cachedTextbooks.pagination);
        setLoading(false);
        // Still fetch welcome message
        const msg = await getWelcomeMessage();
        setWelcomeMsg(msg);
        return;
      }

      // Fetch both in parallel for faster initial load
      setLoading(true);
      try {
        const [welcomeResult, textbooksResponse] = await Promise.all([
          getWelcomeMessage(),
          fetch(
            `${import.meta.env.VITE_API_ENDPOINT}/textbooks?limit=20&offset=0`,
            { headers: { Authorization: `Bearer ${token}` } }
          )
        ]);

        setWelcomeMsg(welcomeResult);

        const textbooksData = await textbooksResponse.json();
        setTextbooks(textbooksData.textbooks || []);
        setPagination(textbooksData.pagination);

        // Cache the response
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(textbooksData));
          sessionStorage.setItem(cacheTimeKey, Date.now().toString());
        } catch (cacheError) {
          console.warn("Cache write error:", cacheError);
        }
      } catch (error) {
        console.error("Error fetching initial data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [token]);

  // Fetch more textbooks (for pagination only)
  const fetchMoreTextbooks = async (offset: number) => {
    if (!token) return;
    
    setLoadingMore(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_ENDPOINT}/textbooks?limit=20&offset=${offset}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      setTextbooks((prev) => [...prev, ...(data.textbooks || [])]);
      // Use the requested offset to ensure correct pagination state
      // (API may return offset: 0 instead of the actual requested offset)
      setPagination({
        ...data.pagination,
        offset: offset,
      });
    } catch (error) {
      console.error("Error fetching more textbooks:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (pagination && pagination.hasMore) {
      fetchMoreTextbooks(pagination.offset + pagination.limit);
    }
  };

  // Convert API textbooks to card format and apply search filtering
  useEffect(() => {
    const convertedBooks: TextbookForCard[] = textbooks.map((book) => ({
      id: book.id, // Use book's ID for card component
      title: book.title,
      author: book.authors || [],
      category: book.level || "General",
      logo_url: book.textbook_logo_url,
    }));

    const q = userSearch.trim().toLowerCase();
    if (!q) {
      setFilteredBooks(convertedBooks);
      return;
    }

    setFilteredBooks(
      convertedBooks.filter(
        (textbook) =>
          textbook.title.toLowerCase().includes(q) ||
          textbook.author.join(" ").toLowerCase().includes(q)
      )
    );
  }, [textbooks, userSearch]);

  return (
    <div className="pt-[70px] flex min-h-screen flex-col bg-background">
      <HomePageHeader />

      {/* Welcome Dialog */}
      <Dialog open={showWelcome} onOpenChange={setShowWelcome}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">Welcome</DialogTitle>
            <DialogDescription className="text-base leading-relaxed pt-4 space-y-4">
              {welcomeMsg ? (
                welcomeMsg
                  .split("\n\n")
                  .map((para, idx) => <p key={idx}>{para}</p>)
              ) : (
                // If the welcome message hasn't loaded for some reason, show the
                // default message (which will mirror the previous hardcoded content)
                // or a loading indicator.
                <p>Loading welcome message...</p>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>

      {/* Main Content */}
      <main className="container mx-auto flex-1 flex-col justify-center px-6 py-16">
        <div className="mx-auto max-w-6xl">
          {/* Hero Section */}
          <div className="mb-12 text-center space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-5xl font-bold tracking-tight text-primary">
              OpenED Textbook Catalogue
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Select a textbook to get started with your AI-powered learning
              journey
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative mx-auto mb-12 max-w-xl">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by Title or Author"
              className="h-12 bg-input border pl-10 text-base shadow-sm"
              onChange={(e) => {
                setUserSearch(e.target.value);
              }}
            />
          </div>

          {/* Textbook Grid */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {loading ? (
              <div className="col-span-full text-center py-8">
                <p>Loading textbooks...</p>
              </div>
            ) : filteredBooks.length === 0 ? (
              <div className="col-span-full text-center py-8">
                <p>No textbooks found.</p>
              </div>
            ) : (
              filteredBooks.map((textbook) => (
                <TextbookCard key={textbook.id} textbook={textbook} />
              ))
            )}
          </div>

          {/* Pagination Controls */}
          {!loading && pagination && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredBooks.length} of {pagination.total} textbooks
              </p>
              {pagination.hasMore && (
                <Button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  variant="outline"
                  className="min-w-[200px]"
                >
                  {loadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Load More Textbooks"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
