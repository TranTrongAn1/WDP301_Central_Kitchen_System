import { useEffect, useState } from 'react';
import { Star, MessageSquare, Loader2 } from 'lucide-react';
import { feedbackApi, type Feedback } from '@/api/FeedbackApi';
import { cn } from '@/shared/lib/utils';

function getCreatorName(fb: Feedback): string {
  if (typeof fb.createdBy === 'object' && fb.createdBy !== null) {
    return (fb.createdBy as any).fullName || (fb.createdBy as any).email || 'Khách hàng';
  }
  return 'Khách hàng';
}

export function CustomerFeedbackSection() {
  const [list, setList] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    feedbackApi
      .getList({ limit: 6 })
      .then((data) => {
        if (!cancelled) setList(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading && list.length === 0) {
    return (
      <div className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Khách hàng nói gì về chúng tôi
            </h2>
            <p className="text-muted-foreground">Đang tải đánh giá...</p>
          </div>
          <div className="flex justify-center py-12">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (error || list.length === 0) {
    return null;
  }

  return (
    <div className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
            <MessageSquare className="w-8 h-8 text-primary" />
            Khách hàng nói gì về chúng tôi
          </h2>
          <p className="text-muted-foreground">
            Phản hồi thật từ cửa hàng và đối tác sử dụng hệ thống bếp trung tâm.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {list.map((fb) => (
            <div
              key={fb._id}
              className={cn(
                'p-6 rounded-2xl border border-border bg-card shadow-sm',
                'transition-transform hover:scale-[1.02] hover:shadow-md'
              )}
            >
              <div className="flex items-center gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={cn(
                      'w-5 h-5',
                      i <= fb.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'
                    )}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-muted-foreground">{fb.rating}/5</span>
              </div>
              <p className="text-foreground text-sm leading-relaxed mb-4 line-clamp-4">
                {fb.content || 'Không có nội dung.'}
              </p>
              <p className="text-xs text-muted-foreground">
                — {getCreatorName(fb)}
                {fb.createdAt && (
                  <span className="ml-1">
                    · {new Date(fb.createdAt).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
