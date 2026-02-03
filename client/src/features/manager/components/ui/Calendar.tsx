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
        <div className="w-full overflow-x-auto p-1">
            <DayPicker
                showOutsideDays={showOutsideDays}
                className={cn("p-2 min-w-[260px] sm:min-w-[280px]", className)}
                classNames={{
                    months: "flex flex-col sm:flex-row gap-2 sm:gap-4",
                    month: "flex flex-col gap-2 sm:gap-4",
                    month_caption: "flex justify-center pt-1 relative items-center mb-2",
                    caption_label: "text-xs sm:text-sm font-medium",
                    nav: "flex items-center gap-1",
                    button_previous: cn(
                        "inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium",
                        "h-6 w-6 sm:h-7 sm:w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        "absolute left-1 sm:left-2 border border-input hover:bg-accent hover:text-accent-foreground"
                    ),
                    button_next: cn(
                        "inline-flex items-center justify-center rounded-lg text-xs sm:text-sm font-medium",
                        "h-6 w-6 sm:h-7 sm:w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                        "absolute right-1 sm:right-2 border border-input hover:bg-accent hover:text-accent-foreground"
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
