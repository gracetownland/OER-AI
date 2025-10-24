import { useState, useEffect } from 'react';
import { Outlet, useParams, useNavigate } from 'react-router';
import { TextbookProvider } from '@/providers/TextbookContext';
import { SidebarProvider } from '@/providers/SidebarContext';
import Header from '@/components/Header';
import StudentSideBar from '@/components/ChatInterface/StudentSideBar';
import type { Textbook } from '@/types/Textbook';

export default function TextbookLayout() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [textbook, setTextbook] = useState<Textbook | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTextbook = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_ENDPOINT}/textbooks/${id}`);
        if (!response.ok) {
          throw new Error('Textbook not found');
        }
        const data = await response.json();
        setTextbook(data);
      } catch (err) {
        setError(err);
        // Redirect to home page if textbook not found
        navigate('/');
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
              textbookTitle={textbook?.title || ''} 
              textbookAuthor={textbook?.authors?.join(', ') || ''}
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