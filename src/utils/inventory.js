/**
 * Inventory Utility Functions
 * Handles dual-unit (boxes + pieces) inventory calculations
 */

// =====================================================
// 1. Get Pieces Per Box based on type, subtype, and size
// =====================================================
export function getPiecesPerBox(size, type = null, subType = null) {
  // If type is provided, use the new rule-based system
  if (type) {
    // Wall tiles
    if (type === "Wall") {
      if (size === "1×1.5") return 6;
      if (size === "1×2") return 6; // Default to 6, options are 5-6
    }
    
    // Floor tiles - depends on subtype
    if (type === "Floor") {
      if (subType === "Matte") {
        if (size === "2×2") return 4;
      }
      
      if (subType === "Glossy" || subType === "High Glossy") {
        if (size === "2×4") return 2;
        if (size === "2×2") return 4;
      }
      
      if (subType === "Rough") {
        if (size === "2×4") return 2;
        if (size === "1×1") return 9;
      }
    }
    
    // Parking tiles
    if (type === "Parking") {
      if (size === "16×16") return 5;
    }
  }
  
  // Fallback to old size-based mapping (backward compatibility)
  const mapping = {
    "1×1": 9,
    "1×1.5": 6,
    "1×2": 6,
    "2×2": 4,
    "2×4": 2,
    "16×16": 5
  };
  
  return mapping[size] || null;
}

// =====================================================
// 1.5. Get available piecesPerBox options based on type, subtype, and size
// =====================================================
export function getPiecesPerBoxOptions(size, type = null, subType = null) {
  // If type is provided, use the new rule-based system
  if (type) {
    // Wall tiles
    if (type === "Wall") {
      if (size === "1×1.5") return [6];
      if (size === "1×2") return [5, 6]; // Can be 5 or 6
    }
    
    // Floor tiles - depends on subtype
    if (type === "Floor") {
      if (subType === "Matte") {
        if (size === "2×2") return [4];
      }
      
      if (subType === "Glossy" || subType === "High Glossy") {
        if (size === "2×4") return [2];
        if (size === "2×2") return [4];
      }
      
      if (subType === "Rough") {
        if (size === "2×4") return [2];
        if (size === "1×1") return [9];
      }
    }
    
    // Parking tiles
    if (type === "Parking") {
      if (size === "16×16") return [5];
    }
  }
  
  // Fallback to old size-based mapping (backward compatibility)
  const options = {
    "1×1": [9],
    "1×1.5": [6],
    "1×2": [5, 6],
    "2×2": [4],
    "2×4": [2],
    "16×16": [5]
  };
  
  return options[size] || [];
}

// =====================================================
// 2. Normalize total pieces to {boxes, pieces} format
// =====================================================
export function normalizePieces(totalPieces, piecesPerBox) {
  if (totalPieces < 0) {
    throw new Error("Cannot normalize negative pieces");
  }
  
  const boxes = Math.floor(totalPieces / piecesPerBox);
  const pieces = totalPieces % piecesPerBox;
  
  return { boxes, pieces };
}

// =====================================================
// 3. Convert {boxes, pieces} to total pieces
// =====================================================
export function toTotalPieces(boxes, pieces, piecesPerBox) {
  if (boxes < 0 || pieces < 0) {
    throw new Error("Cannot have negative boxes or pieces");
  }
  
  if (pieces >= piecesPerBox) {
    throw new Error(`Pieces must be less than ${piecesPerBox}`);
  }
  
  return (boxes * piecesPerBox) + pieces;
}

// =====================================================
// 4. Calculate available quantity
// =====================================================
export function calculateAvailable(product) {
  if (!product.stock || !product.sales || !product.damage) {
    return { boxes: 0, pieces: 0, totalPieces: 0 };
  }

  const stockTotal = toTotalPieces(
    product.stock.boxes || 0,
    product.stock.pieces || 0,
    product.piecesPerBox || 1
  );
  
  const salesTotal = toTotalPieces(
    product.sales?.boxes || 0,
    product.sales?.pieces || 0,
    product.piecesPerBox || 1
  );
  
  const damageTotal = toTotalPieces(
    product.damage?.boxes || 0,
    product.damage?.pieces || 0,
    product.piecesPerBox || 1
  );
  
  const returnsTotal = toTotalPieces(
    product.returns?.boxes || 0,
    product.returns?.pieces || 0,
    product.piecesPerBox || 1
  );
  
  const availableTotal = stockTotal - salesTotal - damageTotal + returnsTotal;
  
  if (availableTotal < 0) {
    return { boxes: 0, pieces: 0, totalPieces: 0 };
  }
  
  const normalized = normalizePieces(availableTotal, product.piecesPerBox || 1);
  
  return {
    boxes: normalized.boxes,
    pieces: normalized.pieces,
    totalPieces: availableTotal
  };
}

// =====================================================
// 5. Validate quantity before sale/damage/return
// =====================================================
export function validateQuantity(totalPiecesNeeded, availableTotalPieces, operation = "sale") {
  const operationLabel = {
    "sale": "sale",
    "damage": "damage",
    "return": "return"
  };
  
  const label = operationLabel[operation] || operation;
  
  if (totalPiecesNeeded < 0) {
    return {
      isValid: false,
      message: `Cannot ${label} negative quantity`
    };
  }
  
  if (totalPiecesNeeded === 0) {
    return {
      isValid: false,
      message: `Must ${label} at least 1 piece`
    };
  }
  
  if (totalPiecesNeeded > availableTotalPieces) {
    return {
      isValid: false,
      message: `Insufficient quantity. Available: ${availableTotalPieces} pc, Needed: ${totalPiecesNeeded} pc`
    };
  }
  
  return {
    isValid: true,
    message: `Valid for ${label}`
  };
}

// =====================================================
// 6. Get availability status
// =====================================================
export function getAvailabilityStatus(availableTotalPieces, piecesPerBox) {
  if (availableTotalPieces === 0) {
    return "out_of_stock";
  }
  
  const availableBoxes = Math.floor(availableTotalPieces / piecesPerBox);
  
  if (availableBoxes >= 3) {
    return "good";
  } else if (availableBoxes >= 1) {
    return "low";
  } else {
    return "critical";
  }
}

// =====================================================
// 7. Get status color
// =====================================================
export function getStatusColor(status) {
  const colors = {
    "good": "#10b981",        // Green
    "low": "#f59e0b",         // Amber/Yellow
    "critical": "#ef4444",    // Red
    "out_of_stock": "#000000" // Black
  };
  
  return colors[status] || "#6b7280"; // Gray default
}

// =====================================================
// 8. Format quantity for display
// =====================================================
export function formatQuantityDisplay(boxes, pieces, includeTotal = true, piecesPerBox = 1) {
  let result = "";
  
  if (boxes > 0) {
    result += `${boxes} bx`;
  }
  
  if (pieces > 0) {
    if (result) result += " + ";
    result += `${pieces} pc`;
  }
  
  if (!result) {
    result = "0 pc";
  }
  
  if (includeTotal) {
    const total = (boxes * piecesPerBox) + pieces;
    result += ` (${total} pcs)`;
  }
  
  return result;
}

// =====================================================
// 9. Validate boxes and pieces format
// =====================================================
export function validateBoxesPieces(boxes, pieces, piecesPerBox) {
  if (boxes < 0 || pieces < 0) {
    return {
      isValid: false,
      message: "Boxes and pieces cannot be negative"
    };
  }
  
  if (pieces >= piecesPerBox) {
    return {
      isValid: false,
      message: `Pieces must be less than ${piecesPerBox}`
    };
  }
  
  return {
    isValid: true,
    message: "Valid format"
  };
}

// =====================================================
// 10. Parse user input (boxes or pieces)
// =====================================================
export function parseDualUnitInput(inputValue, inputType, piecesPerBox) {
  if (inputValue <= 0) {
    throw new Error("Input value must be positive");
  }
  
  let totalPieces;
  
  if (inputType === "boxes") {
    totalPieces = inputValue * piecesPerBox;
  } else if (inputType === "pieces") {
    totalPieces = inputValue;
  } else {
    throw new Error("Invalid input type");
  }
  
  const normalized = normalizePieces(totalPieces, piecesPerBox);
  
  return {
    boxes: normalized.boxes,
    pieces: normalized.pieces,
    totalPieces
  };
}

// =====================================================
// 11. All available sizes
// =====================================================
export const AVAILABLE_SIZES = [
  "1×1",
  "1×1.5",
  "1×2",
  "2×2",
  "2×4",
  "16×16"
];

// =====================================================
// 12. Tile types and subtypes - UPDATED
// =====================================================
export const TILE_TYPES = {
  "Wall": [], // No subtype for Wall
  "Floor": ["Matte", "Glossy", "High Glossy", "Rough"],
  "Parking": [], // No subtype for Parking
  "Other": [] // User can add custom
};

// =====================================================
// 13. Size options per type+subtype combination
// =====================================================
export const SIZE_BY_TYPE = {
  "Wall": ["1×1.5", "1×2"], // Wall has only 2 sizes
  
  "Floor": {
    "Matte": ["2×2"], // Matte has only 2×2
    "Glossy": ["2×2", "2×4"], // Glossy has 2×2 and 2×4
    "High Glossy": ["2×2", "2×4"], // High Glossy same as Glossy
    "Rough": ["2×4", "1×1"] // Rough has 2×4 and 1×1
  },
  
  "Parking": ["16×16"], // Parking has only one size
  
  "Other": ["1×1", "1×1.5", "1×2", "2×2", "2×4", "16×16"] // All sizes available
};

// =====================================================
// 14. HSN Number options
// =====================================================
export const HSN_NUMBERS = [
  "69072100",
  "69072200",
  "69072300"
];

// =====================================================
// 15. Location options
// =====================================================
export const LOCATIONS = [
  "Ground Floor",
  "First Floor"
];

// =====================================================
// 16. Get available sizes for type+subtype
// =====================================================
export function getAvailableSizes(type, subType = null) {
  if (type === "Wall") {
    return SIZE_BY_TYPE["Wall"];
  }
  
  if (type === "Parking") {
    return SIZE_BY_TYPE["Parking"];
  }
  
  if (type === "Floor" && subType && SIZE_BY_TYPE["Floor"][subType]) {
    return SIZE_BY_TYPE["Floor"][subType];
  }
  
  if (type === "Other") {
    return SIZE_BY_TYPE["Other"];
  }
  
  return [];
}
