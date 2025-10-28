import { useState, useEffect } from "react";
import { Outlet, useParams, useNavigate } from "react-router";
import { TextbookProvider } from "@/providers/TextbookContext";
import { SidebarProvider } from "@/providers/SidebarContext";
import Header from "@/components/Header";
import StudentSideBar from "@/components/ChatInterface/StudentSideBar";
import type { Textbook } from "@/types/Textbook";

export default function TextbookLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchTextbook = async () => {
      try {
        // Get public token first
        const tokenResponse = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}/user/publicToken`
        );
        if (!tokenResponse.ok) throw new Error("Failed to get public token");
        const { token } = await tokenResponse.json();

        // Make authenticated request
        const response = await fetch(
          `${import.meta.env.VITE_API_ENDPOINT}/textbooks/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Textbook not found");
        }
        const data = await response.json();
        setTextbook(data);
      } catch (err) {
        setError(err as Error);
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    fetchTextbook();
  }, [id, navigate]);

  return (
    <TextbookProvider value={{ textbook, loading, error }}>
      <SidebarProvider>
        <div className="flex flex-col min-h-screen bg-background">
          <Header />
          <div className="pt-[70px] flex-1 flex">
            <StudentSideBar
              textbookTitle={textbook?.title || ""}
              textbookAuthor={textbook?.authors?.join(", ") || ""}
              textbookId={id}
            />
            <main className="md:ml-64 flex flex-col flex-1 items-start justify-start max-w-screen">
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </TextbookProvider>
  );
}
