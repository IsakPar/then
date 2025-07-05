'use client'

import { useState, useEffect, useRef } from 'react'
import { searchUKAddresses } from '@/lib/geocoding'

interface AddressSuggestion {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  admin_county: string;
  display: string;
}

interface AddressAutocompleteProps {
  name: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  onAddressSelect?: (address: string, coordinates: { lat: number; lng: number }) => void;
}

export default function AddressAutocomplete({ 
  name, 
  value = '', 
  placeholder = "Start typing a UK postcode...", 
  required = false,
  onAddressSelect 
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value)
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (inputValue.length < 2) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await searchUKAddresses(inputValue)
        setSuggestions(results)
        setIsOpen(results.length > 0)
        setSelectedIndex(-1)
      } catch (error) {
        console.error('Search error:', error)
        setSuggestions([])
        setIsOpen(false)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [inputValue])

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  const selectSuggestion = (suggestion: AddressSuggestion) => {
    const fullAddress = `${suggestion.postcode} - ${suggestion.admin_district}, ${suggestion.admin_county}`
    setInputValue(fullAddress)
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
    
    // Call callback with coordinates
    if (onAddressSelect) {
      onAddressSelect(fullAddress, { 
        lat: suggestion.latitude, 
        lng: suggestion.longitude 
      })
    }
    
    inputRef.current?.blur()
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative">
      <input
        ref={inputRef}
        name={name}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) {
            setIsOpen(true)
          }
        }}
        placeholder={placeholder}
        required={required}
        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.postcode}
              onClick={() => selectSuggestion(suggestion)}
              className={`px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-700' 
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{suggestion.postcode}</div>
              <div className="text-sm text-gray-600">
                {suggestion.admin_district}, {suggestion.admin_county}
              </div>
            </div>
          ))}
          
          {suggestions.length === 0 && !isLoading && (
            <div className="px-4 py-3 text-gray-500 text-sm">
              No postcodes found. Try typing a UK postcode like "SW1A 1AA"
            </div>
          )}
        </div>
      )}
    </div>
  )
} 