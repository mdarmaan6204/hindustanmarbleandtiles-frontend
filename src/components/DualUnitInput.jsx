import React, { useState, useEffect } from "react";
import { formatQuantityDisplay } from "../utils/inventory";

/**
 * DualUnitInput Component
 * Allows user to enter quantity as either boxes or pieces
 * Shows live preview of conversion
 */
export function DualUnitInput({
  piecesPerBox = 1,
  value = null,
  onChange = () => {},
  maxBoxes = null,
  maxPieces = null,
  label = "Quantity",
  required = false,
  inputType = "boxes", // "boxes" | "pieces"
  onTypeChange = () => {},
  error = null,
  disabled = false,
}) {
  const [localType, setLocalType] = useState(inputType);
  const [boxesValue, setBoxesValue] = useState("");
  const [piecesValue, setPiecesValue] = useState("");

  useEffect(() => {
    if (value) {
      if (localType === "boxes") {
        setBoxesValue(value.toString());
      } else {
        setPiecesValue(value.toString());
      }
    }
  }, [value, localType]);

  const handleTypeChange = (newType) => {
    setLocalType(newType);
    onTypeChange(newType);
    // Clear old input
    if (newType === "boxes") {
      setPiecesValue("");
    } else {
      setBoxesValue("");
    }
  };

  const handleBoxesChange = (e) => {
    const val = e.target.value;
    setBoxesValue(val);

    if (val) {
      const numVal = parseFloat(val);
      if (numVal > 0) {
        const totalPieces = numVal * piecesPerBox;
        onChange({
          type: "boxes",
          boxes: Math.floor(numVal),
          pieces: 0,
          totalPieces: Math.floor(numVal) * piecesPerBox,
        });
      }
    } else {
      onChange(null);
    }
  };

  const handlePiecesChange = (e) => {
    const val = e.target.value;
    setPiecesValue(val);

    if (val) {
      const numVal = parseInt(val);
      if (numVal > 0) {
        const boxes = Math.floor(numVal / piecesPerBox);
        const pieces = numVal % piecesPerBox;
        onChange({
          type: "pieces",
          boxes,
          pieces,
          totalPieces: numVal,
        });
      }
    } else {
      onChange(null);
    }
  };

  // Calculate preview
  let preview = "";
  if (localType === "boxes" && boxesValue) {
    const numBoxes = parseInt(boxesValue);
    const totalPcs = numBoxes * piecesPerBox;
    preview = formatQuantityDisplay(numBoxes, 0, true, piecesPerBox);
  } else if (localType === "pieces" && piecesValue) {
    const totalPcs = parseInt(piecesValue);
    const boxes = Math.floor(totalPcs / piecesPerBox);
    const pieces = totalPcs % piecesPerBox;
    preview = formatQuantityDisplay(boxes, pieces, true, piecesPerBox);
  }

  const borderColor = error
    ? "border-red-500"
    : localType === "boxes" && boxesValue
    ? "border-green-500"
    : localType === "pieces" && piecesValue
    ? "border-green-500"
    : "border-gray-300";

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <div className="space-y-3">
        {/* Type Selection */}
        <div className="flex gap-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition">
            <input
              type="radio"
              name="unit-type"
              value="boxes"
              checked={localType === "boxes"}
              onChange={() => handleTypeChange("boxes")}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Boxes</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer hover:bg-white p-2 rounded transition">
            <input
              type="radio"
              name="unit-type"
              value="pieces"
              checked={localType === "pieces"}
              onChange={() => handleTypeChange("pieces")}
              disabled={disabled}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Pieces</span>
          </label>
        </div>

        {/* Boxes Input */}
        {localType === "boxes" && (
          <div>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Enter number of boxes..."
              value={boxesValue}
              onChange={handleBoxesChange}
              disabled={disabled}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${borderColor}`}
            />
            {maxBoxes && (
              <p className="text-xs text-gray-500 mt-1">Max: {maxBoxes} boxes</p>
            )}
          </div>
        )}

        {/* Pieces Input */}
        {localType === "pieces" && (
          <div>
            <input
              type="number"
              min="0"
              step="1"
              placeholder="Enter number of pieces..."
              value={piecesValue}
              onChange={handlePiecesChange}
              disabled={disabled}
              className={`w-full px-4 py-2 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${borderColor}`}
            />
            {maxPieces && (
              <p className="text-xs text-gray-500 mt-1">Max: {maxPieces} pieces</p>
            )}
          </div>
        )}

        {/* Preview */}
        {preview && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm font-medium text-blue-900">
              Preview: {preview}
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800">❌ {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default DualUnitInput;
