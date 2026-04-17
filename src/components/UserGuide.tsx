import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GuideItem {
  title: string;
  description: string;
}

interface UserGuideProps {
  title?: string;
  items: GuideItem[];
  className?: string;
}

export function UserGuide({ title = "Hướng dẫn sử dụng", items, className }: UserGuideProps) {
  return (
    <Card className={cn("mt-12 border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-slate-50/50", className)}>
      <CardHeader className="border-b border-slate-100 bg-white/50 py-4">
        <CardTitle className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-600">
          <HelpCircle className="w-4 h-4 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {items.map((item, index) => (
            <div key={index} className="flex gap-3 group">
              <div className="mt-1 flex-shrink-0">
                <ChevronRight className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">{item.title}</p>
                <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
