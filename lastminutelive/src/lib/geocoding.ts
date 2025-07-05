interface PostcodeResult {
  latitude: number;
  longitude: number;
  postcode: string;
  admin_district: string;
  admin_county: string;
}

interface AddressSuggestion {
  postcode: string;
  latitude: number;
  longitude: number;
  admin_district: string;
  admin_county: string;
  display: string;
}

export async function geocodeUKAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    // Extract postcode from address (e.g., "123 High St, London, SW1A 1AA")
    const postcodeMatch = address.match(/([A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})/i);
    
    if (!postcodeMatch) {
      console.log('No UK postcode found in address:', address);
      return null;
    }

    const postcode = postcodeMatch[0].replace(/\s/g, ''); // Remove spaces for API call
    console.log('Geocoding postcode:', postcode);
    
    const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
    
    if (!response.ok) {
      console.log('Postcode not found:', postcode);
      return null;
    }

    const data = await response.json();
    const result: PostcodeResult = data.result;
    
    console.log('Geocoding success:', { lat: result.latitude, lng: result.longitude });
    
    return {
      lat: result.latitude,
      lng: result.longitude
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function searchUKAddresses(query: string): Promise<AddressSuggestion[]> {
  try {
    if (query.length < 2) return [];

    // Use postcodes.io search API
    const response = await fetch(`https://api.postcodes.io/postcodes?q=${encodeURIComponent(query)}&limit=8`);
    
    if (!response.ok) return [];

    const data = await response.json();
    
    if (!data.result || data.result.length === 0) return [];

    return data.result.map((item: PostcodeResult) => ({
      postcode: item.postcode,
      latitude: item.latitude,
      longitude: item.longitude,
      admin_district: item.admin_district,
      admin_county: item.admin_county,
      display: `${item.postcode} - ${item.admin_district}, ${item.admin_county}`
    }));
  } catch (error) {
    console.error('Address search error:', error);
    return [];
  }
}

// Test function for common UK postcodes
export async function testGeocoding() {
  const testAddresses = [
    "123 High Street, London, SW1A 1AA",
    "45 Oxford Street, Manchester, M1 1AA", 
    "67 Princes Street, Edinburgh, EH2 2DG"
  ];
  
  console.log('Testing UK geocoding...');
  for (const address of testAddresses) {
    const result = await geocodeUKAddress(address);
    console.log(`${address} →`, result);
  }
} 