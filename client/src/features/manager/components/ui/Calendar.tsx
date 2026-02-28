import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { cn } from "./cn";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: CalendarProps) {
    return (
        <div className="w-full min-w-0 overflow-x-auto p-1">
            <DayPicker
                showOutsideDays={showOutsideDays}
                navLayout="around"
                className={cn("p-2 min-w-[260px] sm:min-w-[280px] max-w-full", className)}
                classNames={{
                    months: "flex flex-col gap-2",
                    // Grid: hàng 1 = [Prev][Caption][Next], hàng 2 = Grid — luôn trái-phải, responsive
                    month: cn(
                        "grid gap-2 grid-cols-[auto_1fr_auto] grid-rows-[auto_auto]",
                        "[&>*:nth-child(1)]:col-start-1 [&>*:nth-child(1)]:row-start-1",
                        "[&>*:nth-child(2)]:col-start-2 [&>*:nth-child(2)]:row-start-1",
                        "[&>*:nth-child(3)]:col-start-3 [&>*:nth-child(3)]:row-start-1",
                        "[&>*:nth-child(4)]:col-span-3 [&>*:nth-child(4)]:row-start-2 [&>*:nth-child(4)]:min-w-0"
                    ),
                    month_caption: "flex items-center justify-center pt-1 pb-1",
                    caption_label: "text-xs sm:text-sm font-medium text-center truncate",
                    nav: "flex items-center gap-1",
                    button_previous: cn(
                        "shrink-0 inline-flex items-center justify-center rounded-full text-xs sm:text-sm",
                        "h-7 w-7 sm:h-8 sm:w-8 bg-card/80 border border-border",
                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm"
                    ),
                    button_next: cn(
                        "shrink-0 inline-flex items-center justify-center rounded-full text-xs sm:text-sm",
                        "h-7 w-7 sm:h-8 sm:w-8 bg-card/80 border border-border",
                        "text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors shadow-sm"
                    ),
                    month_grid: "w-full border-collapse",
                    weekdays: "flex justify-between text-xs",
                    weekday: "text-muted-foreground rounded-md w-8 sm:w-9 font-normal text-[0.65rem] sm:text-[0.8rem] text-center",
                    week: "flex justify-between w-full mt-1 sm:mt-2",
                    day: "h-7 w-7 sm:h-9 sm:w-9 text-center text-xs sm:text-sm p-0 relative",
                    day_button: cn(
                        "inline-flex items-center justify-center rounded-lg text-xs sm:text-sm",
                        "h-7 w-7 sm:h-9 sm:w-9 p-0 font-normal hover:bg-accent hover:text-accent-foreground",
                        "transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
                    ),
                    selected:
                        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg",
                    today: "bg-accent text-accent-foreground rounded-lg",
                    outside: "text-muted-foreground opacity-50",
                    disabled: "text-muted-foreground opacity-50",
                    range_middle:
                        "aria-selected:bg-accent aria-selected:text-accent-foreground",
                    hidden: "invisible",
                    ...classNames,
                }}
                components={{
                    Chevron: ({ orientation, ...props }) => {
                        if (orientation === "left") {
                            return <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" {...props} />;
                        }
                        return <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" {...props} />;
                    },
                }}
                {...props}
            />
        </div>
    );
}
Calendar.displayName = "Calendar";

export { Calendar };
