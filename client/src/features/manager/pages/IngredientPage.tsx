import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Boxes, AlertTriangle, Clock, Search, MoreHorizontal, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Progress } from '../components/ui/Progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/Table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/DropdownMenu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/Dialog';
import { Label } from '../components/ui/Label';
import { ingredientApi, type Ingredient, type Supplier, type IngredientBatch } from '@/api/IngredientApi';
import toast from 'react-hot-toast';
import { cn } from '../components/ui/cn';

export default function IngredientPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [batches, setBatches] = useState<IngredientBatch[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchesLoading, setIsBatchesLoading] = useState(false);
  
  const [isIngredientFormOpen, setIsIngredientFormOpen] = useState(false);
  const [isBatchFormOpen, setIsBatchFormOpen] = useState(false);
  
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [expandedIngredient, setExpandedIngredient] = useState<string | null>(null);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ingredients');

  const fetchIngredients = async () => {
    try {
      setIsLoading(true);
      const response = await ingredientApi.getAll();
      if (response.data) {
        const ingredientsData = Array.isArray(response.data) 
          ? response.data 
          : [response.data];
        setIngredients(ingredientsData);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch ingredients';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async (ingredientId: string) => {
    try {
      setIsBatchesLoading(true);
      const response = await ingredientApi.getBatches(ingredientId);
      if (response.data) {
        setBatches(response.data);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch batches';
      toast.error(errorMessage);
    } finally {
      setIsBatchesLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setSuppliers([
      { _id: '1', name: 'Công ty TNHH Bột', email: 'bot@example.com', phone: '0123456789', status: 'Active' },
      { _id: '2', name: 'Công ty Trứng', email: 'trung@example.com', phone: '0123456790', status: 'Active' },
    ]);
  };

  useEffect(() => {
    fetchIngredients();
    fetchSuppliers();
  }, []);

  const filteredIngredients = ingredients.filter(
    (ingredient) =>
      ingredient.ingredientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleIngredientSubmit = async (data: { ingredientName: string; unit: string; costPrice: number; warningThreshold: number }) => {
    setIsSubmitting(true);
    try {
      if (editingIngredient) {
        await ingredientApi.update(editingIngredient._id, data);
        toast.success('Ingredient updated successfully');
      } else {
        await ingredientApi.create(data);
        toast.success('Ingredient created successfully');
      }
      setIsIngredientFormOpen(false);
      setEditingIngredient(null);
      fetchIngredients();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (data: { batchCode: string; expiryDate: string; initialQuantity: number; price: number; supplierId: string }) => {
    if (!selectedIngredient) return;
    
    setIsSubmitting(true);
    try {
      await ingredientApi.addBatch(selectedIngredient._id, data);
      toast.success('Batch added successfully');
      setIsBatchFormOpen(false);
      fetchIngredients();
      fetchBatches(selectedIngredient._id);
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIngredient = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this ingredient?')) {
      try {
        await ingredientApi.delete(id);
        toast.success('Ingredient deleted successfully');
        fetchIngredients();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'An error occurred';
        toast.error(errorMessage);
      }
    }
  };

  const handleEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIsIngredientFormOpen(true);
  };

  const handleAddBatch = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    setIsBatchFormOpen(true);
  };

  const handleViewBatches = (ingredient: Ingredient) => {
    setSelectedIngredient(ingredient);
    fetchBatches(ingredient._id);
    setActiveTab('batches');
  };

  const handleToggleExpand = (ingredient: Ingredient) => {
    if (expandedIngredient === ingredient._id) {
      setExpandedIngredient(null);
    } else {
      setExpandedIngredient(ingredient._id);
      if (selectedIngredient?._id !== ingredient._id) {
        setSelectedIngredient(ingredient);
        fetchBatches(ingredient._id);
      }
    }
  };

  const lowStockCount = ingredients.filter(i => i.totalQuantity < i.warningThreshold && i.totalQuantity > 0).length;
  const outOfStockCount = ingredients.filter(i => i.totalQuantity === 0).length;
  const expiringSoonCount = batches.filter(b => {
    const daysLeft = Math.ceil((new Date(b.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysLeft <= 3;
  }).length;

  const getStatusConfig = (ingredient: Ingredient) => {
    const isBelowThreshold = ingredient.totalQuantity < ingredient.warningThreshold;
    
    if (isBelowThreshold && ingredient.totalQuantity === 0) {
      return { variant: 'destructive' as const, label: 'Out of Stock', color: 'bg-red-500', bgClass: 'bg-red-500/10 text-red-500 border-red-500/30' };
    }
    if (isBelowThreshold) {
      return { variant: 'warning' as const, label: 'Low Stock', color: 'bg-yellow-500', bgClass: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' };
    }
    return { variant: 'success' as const, label: 'In Stock', color: 'bg-green-500', bgClass: 'bg-green-500/10 text-green-500 border-green-500/30' };
  };

  const CountdownRing = ({ daysLeft, maxDays = 30 }: { daysLeft: number; maxDays?: number }) => {
    const percentage = Math.min(Math.max((daysLeft / maxDays) * 100, 0), 100);
    const circumference = 2 * Math.PI * 18;
    const offset = circumference - (percentage / 100) * circumference;
    
    const colorClass = daysLeft <= 1 ? 'text-red-500' : daysLeft <= 3 ? 'text-yellow-500' : 'text-green-500';

    return (
      <div className="relative w-12 h-12 flex items-center justify-center">
        <svg width={48} height={48} className="transform -rotate-90">
          <circle
            cx={24}
            cy={24}
            r={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            className="text-muted/30"
          />
          <motion.circle
            cx={24}
            cy={24}
            r={18}
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
            strokeLinecap="round"
            className={colorClass}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ strokeDasharray: circumference }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-sm font-bold", colorClass)}>{daysLeft}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Ingredient Management
          </h1>
          <p className="text-muted-foreground mt-1">Manage raw materials and batches</p>
        </div>
        <Button onClick={() => { setEditingIngredient(null); setIsIngredientFormOpen(true); }} className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Ingredient
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Ingredients', value: ingredients.length, icon: Package, color: 'text-primary', gradient: 'from-primary/5 to-primary/10' },
          { label: 'Low Stock', value: lowStockCount, icon: AlertTriangle, color: 'text-yellow-500', gradient: 'from-yellow-500/5 to-yellow-500/10' },
          { label: 'Out of Stock', value: outOfStockCount, icon: Boxes, color: 'text-red-500', gradient: 'from-red-500/5 to-red-500/10' },
          { label: 'Expiring Soon', value: expiringSoonCount, icon: Clock, color: 'text-orange-500', gradient: 'from-orange-500/5 to-orange-500/10' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + index * 0.05 }}
            whileHover={{ y: -4, scale: 1.02 }}
          >
            <Card className="card-premium overflow-hidden relative">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", stat.gradient)} />
              <CardContent className="p-4 flex items-center gap-4 relative">
                <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center bg-background/50", stat.color)}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1 rounded-xl">
          <TabsTrigger value="ingredients" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Package className="w-4 h-4 mr-2" />
            Ingredients
          </TabsTrigger>
          <TabsTrigger value="batches" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Boxes className="w-4 h-4 mr-2" />
            Batches
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients" className="space-y-4">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="p-4 card-premium">
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search ingredients..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl"
                />
              </div>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card className="card-premium overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-b border-border/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Ingredient Name</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        <div className="flex items-center justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : filteredIngredients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No ingredients found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredIngredients.map((ingredient, index) => {
                      const isExpanded = expandedIngredient === ingredient._id;
                      const status = getStatusConfig(ingredient);
                      const stockLevel = Math.min((ingredient.totalQuantity / (ingredient.warningThreshold * 3 || 30)) * 100, 100);

                      return (
                        <>
                          <motion.tr
                            key={ingredient._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`group cursor-pointer transition-all duration-300 hover:bg-muted/30 ${isExpanded ? 'bg-muted/50' : ''}`}
                            onClick={() => handleToggleExpand(ingredient)}
                          >
                            <TableCell className="py-4">
                              <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                              </motion.div>
                            </TableCell>
                            <TableCell>
                              <motion.div 
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                              >
                                <span className="text-lg">📦</span>
                              </motion.div>
                            </TableCell>
                            <TableCell className="font-semibold">{ingredient.ingredientName}</TableCell>
                            <TableCell className="text-muted-foreground">{ingredient.unit}</TableCell>
                            <TableCell className="font-mono">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ingredient.costPrice)}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                <span className="font-mono">{ingredient.totalQuantity} {ingredient.unit}</span>
                                <Progress value={stockLevel} className="h-1.5" indicatorClassName={status.color} />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={status.variant}>{status.label}</Badge>
                            </TableCell>
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl">
                                  <DropdownMenuItem onClick={() => handleViewBatches(ingredient)} className="cursor-pointer rounded-lg">
                                    📋 View Batches
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAddBatch(ingredient)} className="cursor-pointer rounded-lg">
                                    ➕ Add Batch
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditIngredient(ingredient)} className="cursor-pointer rounded-lg">
                                    <Pencil className="w-4 h-4 mr-2" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleDeleteIngredient(ingredient._id)} className="cursor-pointer rounded-lg text-destructive">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </motion.tr>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.tr
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <TableCell colSpan={8} className="p-0 border-0">
                                  <motion.div
                                    initial={{ opacity: 0, y: -10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 dark:from-white/5 dark:to-transparent"
                                  >
                                    <div className="max-w-4xl mx-auto">
                                      <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                                          <Package className="w-5 h-5 text-white" />
                                        </div>
                                        <div>
                                          <h3 className="font-bold text-lg">{ingredient.ingredientName}</h3>
                                          <p className="text-sm text-muted-foreground">Ingredient details and batch information</p>
                                        </div>
                                      </div>

                                      {/* Quick Stats */}
                                      <div className="grid grid-cols-4 gap-4 mb-6">
                                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-background/50 border border-border/30">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                              <Package className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Total Quantity</p>
                                              <p className="font-bold">{ingredient.totalQuantity} {ingredient.unit}</p>
                                            </div>
                                          </div>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-background/50 border border-border/30">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                                              <span className="text-lg">💰</span>
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Cost Price</p>
                                              <p className="font-bold">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(ingredient.costPrice)}</p>
                                            </div>
                                          </div>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-background/50 border border-border/30">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                                              <AlertTriangle className="w-5 h-5 text-yellow-500" />
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Warning At</p>
                                              <p className="font-bold">{ingredient.warningThreshold} {ingredient.unit}</p>
                                            </div>
                                          </div>
                                        </motion.div>
                                        <motion.div whileHover={{ scale: 1.02 }} className="p-4 rounded-xl bg-background/50 border border-border/30">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                                              <Boxes className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div>
                                              <p className="text-xs text-muted-foreground">Batches</p>
                                              <p className="font-bold">{batches.length} active</p>
                                            </div>
                                          </div>
                                        </motion.div>
                                      </div>

                                      {batches.length > 0 && (
                                        <div>
                                          <h4 className="font-semibold mb-3">Recent Batches</h4>
                                          <div className="grid grid-cols-3 gap-3">
                                            {batches.slice(0, 3).map((batch) => {
                                              const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                              return (
                                                <motion.div
                                                  key={batch._id}
                                                  whileHover={{ scale: 1.02 }}
                                                  className="p-3 rounded-lg bg-background/50 border border-border/30"
                                                >
                                                  <div className="flex items-center justify-between mb-2">
                                                    <code className="text-xs bg-muted/50 px-2 py-1 rounded font-mono">{batch.batchCode}</code>
                                                    <CountdownRing daysLeft={daysLeft} />
                                                  </div>
                                                  <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Qty:</span>
                                                    <span className="font-mono">{batch.currentQuantity}</span>
                                                  </div>
                                                  <div className="flex justify-between text-sm">
                                                    <span className="text-muted-foreground">Exp:</span>
                                                    <span className="font-mono text-xs">{new Date(batch.expiryDate).toLocaleDateString('vi-VN')}</span>
                                                  </div>
                                                </motion.div>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                </TableCell>
                              </motion.tr>
                            )}
                          </AnimatePresence>
                        </>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="batches">
          {selectedIngredient ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Batches for: {selectedIngredient.ingredientName}</h3>
                  <p className="text-sm text-muted-foreground">Total Quantity: {selectedIngredient.totalQuantity} {selectedIngredient.unit}</p>
                </div>
                <Button onClick={() => { setIsBatchFormOpen(true); }}>
                  <Plus className="w-4 h-4 mr-2" /> Add Batch
                </Button>
              </div>
              
              <Card className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-b border-border/50">
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Batch Code</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Quantity</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isBatchesLoading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : batches.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                          No batches found for this ingredient
                        </TableCell>
                      </TableRow>
                    ) : (
                      batches.map((batch) => {
                        const daysLeft = Math.ceil((new Date(batch.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                        const statusConfig = daysLeft <= 1 
                          ? { variant: 'destructive' as const, label: 'Critical' }
                          : daysLeft <= 3 
                            ? { variant: 'warning' as const, label: 'Expiring Soon' }
                            : { variant: 'success' as const, label: 'Fresh' };

                        return (
                          <TableRow key={batch._id} className={cn("group transition-colors hover:bg-muted/30", daysLeft <= 3 && "bg-red-50/50 dark:bg-red-500/5")}>
                            <TableCell className="py-4">
                              <motion.div 
                                className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                              >
                                <span className="text-lg">📦</span>
                              </motion.div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded-lg font-mono">{batch.batchCode}</code>
                            </TableCell>
                            <TableCell className="font-medium">{batch.supplierId?.name || 'N/A'}</TableCell>
                            <TableCell className="font-mono">{batch.currentQuantity} / {batch.initialQuantity}</TableCell>
                            <TableCell className="font-mono">
                              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(batch.price)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(batch.expiryDate).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              <CountdownRing daysLeft={daysLeft} />
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Boxes className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select an ingredient to view its batches</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Ingredient Form Dialog */}
      <Dialog open={isIngredientFormOpen} onOpenChange={setIsIngredientFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingIngredient ? 'Edit Ingredient' : 'Add New Ingredient'}</DialogTitle>
            <DialogDescription>
              {editingIngredient ? 'Update ingredient information' : 'Create a new ingredient'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleIngredientSubmit({
              ingredientName: formData.get('ingredientName') as string,
              unit: formData.get('unit') as string,
              costPrice: Number(formData.get('costPrice')),
              warningThreshold: Number(formData.get('warningThreshold')) || 10,
            });
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="ingredientName">Ingredient Name</Label>
              <Input id="ingredientName" name="ingredientName" defaultValue={editingIngredient?.ingredientName} placeholder="e.g., Bột mì" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" name="unit" defaultValue={editingIngredient?.unit} placeholder="e.g., kg, g, cái" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="costPrice">Cost Price (VND)</Label>
              <Input id="costPrice" name="costPrice" type="number" defaultValue={editingIngredient?.costPrice} placeholder="0" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="warningThreshold">Warning Threshold</Label>
              <Input id="warningThreshold" name="warningThreshold" type="number" defaultValue={editingIngredient?.warningThreshold || 10} placeholder="10" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsIngredientFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90">
                {isSubmitting ? 'Saving...' : editingIngredient ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isBatchFormOpen} onOpenChange={setIsBatchFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Batch</DialogTitle>
            <DialogDescription>Add a new batch for {selectedIngredient?.ingredientName}</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleBatchSubmit({
              batchCode: formData.get('batchCode') as string,
              expiryDate: formData.get('expiryDate') as string,
              initialQuantity: Number(formData.get('initialQuantity')),
              price: Number(formData.get('price')),
              supplierId: formData.get('supplierId') as string,
            });
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="batchCode">Batch Code</Label>
              <Input id="batchCode" name="batchCode" placeholder="e.g., LOT001" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="supplierId">Supplier</Label>
              <Select name="supplierId" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.filter(s => s.status === 'Active').map((supplier) => (
                    <SelectItem key={supplier._id} value={supplier._id}>{supplier.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="initialQuantity">Quantity ({selectedIngredient?.unit})</Label>
              <Input id="initialQuantity" name="initialQuantity" type="number" placeholder="0" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="price">Price (VND)</Label>
              <Input id="price" name="price" type="number" placeholder="0" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="expiryDate">Expiry Date</Label>
              <Input id="expiryDate" name="expiryDate" type="date" min={new Date().toISOString().split('T')[0]} required />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsBatchFormOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90">
                {isSubmitting ? 'Adding...' : 'Add Batch'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
