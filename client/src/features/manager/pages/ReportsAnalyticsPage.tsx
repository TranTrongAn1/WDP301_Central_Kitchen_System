import { motion } from 'framer-motion';
import { BarChart3, Download } from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const ReportsAnalyticsPage = () => {
    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                </div>
                <Button className="bg-gradient-to-r from-orange-600 to-amber-600">
                    <Download className="w-4 h-4 mr-2" />
                    Export Reports
                </Button>
            </div>

            <Card>
                <CardContent className="p-6">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center py-16 text-center"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center mb-4">
                            <BarChart3 className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Reports & Analytics</h3>
                        <p className="text-muted-foreground max-w-sm">
                            This page will display detailed reports and analytics. API integration coming soon.
                        </p>
                    </motion.div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ReportsAnalyticsPage;
