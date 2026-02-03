import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
    icon?: LucideIcon;
    title?: string;
    message?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon = Package,
    title = "No data found",
    message = "Get started by creating your first item.",
    actionLabel,
    onAction,
    className = ""
}: EmptyStateProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col items-center justify-center py-16 text-center ${className}`}
        >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-foreground">{title}</h3>
            <p className="text-muted-foreground max-w-sm mb-4">{message}</p>
            {actionLabel && onAction && (
                <Button onClick={onAction} className="bg-gradient-to-r from-orange-600 to-amber-600">
                    {actionLabel}
                </Button>
            )}
        </motion.div>
    );
}
