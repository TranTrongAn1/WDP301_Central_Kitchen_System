import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Package, Search, MoreHorizontal, Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
// Badge import removed - not used in this component
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../components/ui/Dialog';
import { Label } from '../components/ui/Label';
import { categoryApi, type Category } from '@/api/CategoryApi';
import toast from 'react-hot-toast';

export default function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await categoryApi.getAll();
      if (response.data) {
        // response.data is CategoryResponse which has data property
        const responseData = response.data as any;
        const categoriesData = responseData.data
          ? (Array.isArray(responseData.data) ? responseData.data : [responseData.data])
          : (Array.isArray(responseData) ? responseData : []);
        setCategories(categoriesData);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch categories';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const filteredCategories = categories.filter(
    (category) =>
      category.categoryName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (data: { categoryName: string }) => {
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        await categoryApi.update(editingCategory._id, data);
        toast.success('Category updated successfully');
      } else {
        await categoryApi.create(data);
        toast.success('Category created successfully');
      }
      setIsFormOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'An error occurred';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        await categoryApi.delete(id);
        toast.success('Category deleted successfully');
        fetchCategories();
      } catch (error: any) {
        const errorMessage = error.response?.data?.message || 'An error occurred';
        toast.error(errorMessage);
      }
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setIsFormOpen(true);
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setIsFormOpen(true);
  };

  const totalCategories = categories.length;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
        </div>
        <Button onClick={handleCreate} className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90">
          <Plus className="w-4 h-4 mr-2" />
          Add Category
        </Button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="card-premium overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-primary/10" />
          <CardContent className="p-4 flex items-center gap-4 relative">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Categories</p>
              <p className="text-2xl font-bold">{totalCategories}</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <Card className="p-4 card-premium">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl"
            />
          </div>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="card-premium overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/50">
                <TableHead className="w-12"></TableHead>
                <TableHead className="w-12"></TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredCategories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No categories found
                  </TableCell>
                </TableRow>
              ) : (
                filteredCategories.map((category, index) => {
                  const isExpanded = expandedCategory === category._id;

                  return (
                    <>
                      <motion.tr
                        key={category._id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className={`group cursor-pointer transition-all duration-300 hover:bg-muted/30 ${isExpanded ? 'bg-muted/50' : ''}`}
                        onClick={() => setExpandedCategory(isExpanded ? null : category._id)}
                      >
                        <TableCell className="py-4">
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </motion.div>
                        </TableCell>
                        <TableCell>
                          <motion.div
                            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/10 to-orange-500/10 flex items-center justify-center"
                            whileHover={{ scale: 1.1, rotate: 5 }}
                          >
                            <span className="text-lg">📁</span>
                          </motion.div>
                        </TableCell>
                        <TableCell className="font-semibold">{category.categoryName}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(category.createdAt).toLocaleDateString('vi-VN')}
                        </TableCell>
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                onClick={() => handleEdit(category)}
                                className="cursor-pointer rounded-lg"
                              >
                                <Pencil className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(category._id)}
                                className="cursor-pointer rounded-lg text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
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
                            <TableCell colSpan={5} className="p-0 border-0">
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="p-6 bg-gradient-to-br from-muted/30 to-muted/10 dark:from-white/5 dark:to-transparent"
                              >
                                <div className="max-w-2xl mx-auto">
                                  <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-500 flex items-center justify-center">
                                      <Package className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <h3 className="font-bold text-lg">Category Details</h3>
                                      <p className="text-sm text-muted-foreground">View category information</p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                    <motion.div
                                      whileHover={{ scale: 1.02 }}
                                      className="p-4 rounded-xl bg-background/50 dark:bg-white/5 border border-border/30"
                                    >
                                      <p className="text-xs text-muted-foreground mb-1">Category Name</p>
                                      <p className="font-semibold">{category.categoryName}</p>
                                    </motion.div>
                                    <motion.div
                                      whileHover={{ scale: 1.02 }}
                                      className="p-4 rounded-xl bg-background/50 dark:bg-white/5 border border-border/30"
                                    >
                                      <p className="text-xs text-muted-foreground mb-1">Created At</p>
                                      <p className="font-semibold">{new Date(category.createdAt).toLocaleString('vi-VN')}</p>
                                    </motion.div>
                                    <motion.div
                                      whileHover={{ scale: 1.02 }}
                                      className="p-4 rounded-xl bg-background/50 dark:bg-white/5 border border-border/30"
                                    >
                                      <p className="text-xs text-muted-foreground mb-1">Last Updated</p>
                                      <p className="font-semibold">{new Date(category.updatedAt).toLocaleString('vi-VN')}</p>
                                    </motion.div>
                                    <motion.div
                                      whileHover={{ scale: 1.02 }}
                                      className="p-4 rounded-xl bg-background/50 dark:bg-white/5 border border-border/30"
                                    >
                                      <p className="text-xs text-muted-foreground mb-1">ID</p>
                                      <p className="font-mono text-xs">{category._id}</p>
                                    </motion.div>
                                  </div>
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

      {/* Category Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add New Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update category information' : 'Create a new category'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSubmit({ categoryName: formData.get('categoryName') as string });
          }} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                name="categoryName"
                defaultValue={editingCategory?.categoryName}
                placeholder="e.g., Bánh Nướng"
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-primary to-orange-500 hover:opacity-90">
                {isSubmitting ? 'Saving...' : editingCategory ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
