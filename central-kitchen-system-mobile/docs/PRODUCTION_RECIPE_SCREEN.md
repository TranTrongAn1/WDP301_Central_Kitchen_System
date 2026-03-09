# ProductionRecipeScreen Implementation Guide

## Overview

Complete implementation of the Production Recipe Screen for the Central Kitchen mobile app. This screen allows kitchen staff to:

- View product recipes
- Calculate total ingredient requirements
- Track ingredient batch usage
- Save production results with ingredient tracking

## Files Created/Modified

### 1. **lib/products.ts** (Updated)

Added recipe structure to Product type:

```typescript
export type RecipeIngredient = {
  ingredientId: {
    _id: string;
    ingredientName: string;
    unit: string;
  };
  quantity: number; // per unit (e.g., per cake)
};

export type Product = {
  // ... existing fields
  recipe?: RecipeIngredient[];
};
```

### 2. **lib/production-plans.ts** (Updated)

Added types for ingredient usage tracking:

```typescript
export type IngredientBatchUsage = {
  batchId: string;
  usedQuantity: number;
};

export type IngredientUsage = {
  ingredientId: string;
  batches: IngredientBatchUsage[];
};

export type CompleteItemPayload = {
  productId: string;
  actualQuantity: number;
  ingredientsUsed?: IngredientUsage[];
};
```

### 3. **lib/api.ts** (Updated)

Updated production plans API import and completeItem method:

- Added `CompleteItemPayload` type import
- Updated `completeItem()` method to accept new payload structure

### 4. **hooks/use-production-recipe.ts** (New)

Custom hook for managing production recipe state and operations:

**Features:**

- Fetches product recipe from API
- Loads ingredient batches for each recipe item
- Calculates total ingredient requirements
- Manages ingredient batch usage input
- Validates ingredient usage before saving
- Submits production results with ingredient tracking

**Key Functions:**

- `updateBatchUsage()` - Updates used quantity for a batch
- `validateUsage()` - Validates total usage meets requirements
- `saveProduction()` - Saves production result with ingredient tracking

### 5. **app/(main)/kitchen/production/recipe.tsx** (New)

Production Recipe Screen component:

**Layout:**

- Back button and product name header
- Planned quantity display
- Ingredients section with:
  - Ingredient name
  - Per-unit quantity
  - Total required quantity
  - List of available batches with expiry dates
  - Input field for actual used quantity per batch
- Save button (bottom)

**Interactions:**

- Users tap product in production plan → navigates to recipe screen
- Users enter used quantity for each batch
- Validation ensures total usage ≥ total required
- Success saves and returns to production plan

### 6. **app/(main)/kitchen/production/[id].tsx** (Updated)

Updated production detail screen:

- Made product items Pressable (tappable)
- Added navigation handler to recipe screen
- Passes: planId, productId, plannedQuantity, productName as params

### 7. **app/(main)/\_layout.tsx** (Updated)

Added routing for recipe screen:

```typescript
<Stack.Screen
  name="kitchen/production/recipe"
  options={{ headerShown: false }}
/>
```

## Data Flow

### Step 1: Navigate to Recipe Screen

User taps a product in production plan detail:

```typescript
router.push({
  pathname: "/kitchen/production/recipe",
  params: {
    planId: plan._id,
    productId: productId,
    plannedQuantity: String(planned),
    productName: productName(detail),
  },
});
```

### Step 2: Load Recipe

Hook fetches:

```
GET /api/products/{productId}
```

Response includes recipe array with ingredients and quantities.

### Step 3: Load Ingredient Batches

For each recipe ingredient:

```
GET /api/ingredients/{ingredientId}/batches?activeOnly=true
```

### Step 4: Calculate Requirements

```
totalRequired = recipeItem.quantity × plannedQuantity
```

### Step 5: User Input

Kitchen staff enters used quantity for each batch.

### Step 6: Validation

Validates:

- ✓ Sum of batch usage ≥ total required
- ✓ No batch usage exceeds remaining quantity

### Step 7: Save Production

```
POST /api/production-plans/{planId}/complete-item
{
  "productId": "...",
  "actualQuantity": plannedQuantity,
  "ingredientsUsed": [
    {
      "ingredientId": "...",
      "batches": [
        {
          "batchId": "...",
          "usedQuantity": 0.5
        }
      ]
    }
  ]
}
```

## Features Implemented

✅ **Recipe Management**

- Fetches product recipes with ingredient details
- Displays per-unit and total ingredient quantities

✅ **Batch Selection**

- Shows available ingredient batches
- Displays batch code, remaining quantity, expiry date
- Loads active batches only

✅ **Quantity Input**

- Text input for each batch
- Decimal support for fractional quantities
- Real-time state updates

✅ **Validation**

- Ensures total usage meets requirements
- Prevents over-usage from single batch
- Shows specific error messages

✅ **Production Tracking**

- Saves actual production quantity
- Tracks which batches were used
- Records exact quantities used

✅ **UI/UX**

- Consistent styling with production plan
- Loading and error states
- Confirmation dialogs
- Toast notifications
- Responsive layout with safe areas

## Styling

Uses consistent theme:

- Primary color: `#D91E18` (Red)
- Background: `#FFF4F4` (Light pink)
- Cards: White with pink borders
- Text: Dark gray `#2A2A2A` with secondary `#8C8C8C`

## Error Handling

- API errors caught and displayed
- Recipe calculation errors prevented
- Validation errors show specific messages
- Network timeouts handled

## Testing Checklist

- [ ] Product recipes load correctly
- [ ] Ingredient batches display for each ingredient
- [ ] Calculations show correct total requirements
- [ ] Batch usage input accepts decimal values
- [ ] Validation prevents save if under-stocked
- [ ] Validation prevents over-using single batch
- [ ] Save button disabled during submission
- [ ] Success returns to production plan
- [ ] Error messages display correctly
- [ ] Back button navigates correctly
