import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('📸 Admin: Uploading show image...')
    
    const formData = await request.formData()
    const file = formData.get('image') as File
    const showSlug = formData.get('showSlug') as string
    
    if (!file) {
      return NextResponse.json({
        success: false,
        error: 'No image file provided'
      }, { status: 400 })
    }
    
    if (!showSlug) {
      return NextResponse.json({
        success: false,
        error: 'Show slug is required'
      }, { status: 400 })
    }
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid file type. Please upload JPG, PNG, or WebP images.',
        allowedTypes
      }, { status: 400 })
    }
    
    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        success: false,
        error: 'File too large. Maximum size is 5MB.',
        fileSize: file.size,
        maxSize
      }, { status: 400 })
    }
    
    // Create directory structure: /public/shows/{slug}/
    const showDir = join(process.cwd(), 'public', 'shows', showSlug)
    
    try {
      await mkdir(showDir, { recursive: true })
      console.log(`✅ Created directory: ${showDir}`)
    } catch (dirError) {
      console.log(`📁 Directory already exists: ${showDir}`)
    }
    
    // Generate filename with timestamp to avoid conflicts
    const timestamp = new Date().getTime()
    const extension = file.name.split('.').pop()
    const filename = `poster.${extension}` // Main poster
    const backupFilename = `poster-${timestamp}.${extension}` // Backup with timestamp
    
    const mainFilePath = join(showDir, filename)
    const backupFilePath = join(showDir, backupFilename)
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    
    // Save main poster file
    await writeFile(mainFilePath, buffer)
    console.log(`✅ Saved main poster: ${mainFilePath}`)
    
    // Save backup with timestamp
    await writeFile(backupFilePath, buffer)
    console.log(`✅ Saved backup: ${backupFilePath}`)
    
    // Generate URLs
    const imageUrl = `/shows/${showSlug}/poster.${extension}`
    const backupUrl = `/shows/${showSlug}/poster-${timestamp}.${extension}`
    
    return NextResponse.json({
      success: true,
      message: `📸 Image uploaded successfully for ${showSlug}`,
      imageUrl, // Main URL to use in database
      files: {
        main: {
          url: imageUrl,
          path: mainFilePath,
          filename
        },
        backup: {
          url: backupUrl,
          path: backupFilePath,
          filename: backupFilename
        }
      },
      fileInfo: {
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString()
      },
      integration: {
        directory_structure: 'organized',
        backup_created: true,
        url_ready: true
      }
    })
    
  } catch (error) {
    console.error('❌ Image upload failed:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error',
      help: {
        commonIssues: [
          'File too large (max 5MB)',
          'Invalid file type (use JPG, PNG, WebP)',
          'Invalid show slug format',
          'Insufficient disk space',
          'File permissions issue'
        ],
        supportedFormats: ['JPEG', 'JPG', 'PNG', 'WebP'],
        maxFileSize: '5MB'
      }
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get show images status - useful for admin dashboard
    const { searchParams } = new URL(request.url)
    const showSlug = searchParams.get('showSlug')
    
    if (!showSlug) {
      return NextResponse.json({
        success: false,
        error: 'Show slug parameter required'
      }, { status: 400 })
    }
    
    const showDir = join(process.cwd(), 'public', 'shows', showSlug)
    
    try {
      const { readdir } = await import('fs/promises')
      const files = await readdir(showDir)
      
      const imageFiles = files.filter(file => 
        /\.(jpg|jpeg|png|webp)$/i.test(file)
      )
      
      const imageInfo = imageFiles.map(file => ({
        filename: file,
        url: `/shows/${showSlug}/${file}`,
        type: file.includes('poster') ? 'poster' : 'other'
      }))
      
      return NextResponse.json({
        success: true,
        showSlug,
        directory: showDir,
        images: imageInfo,
        imageCount: imageFiles.length,
        hasPoster: imageFiles.some(file => file.startsWith('poster'))
      })
      
    } catch (dirError) {
      return NextResponse.json({
        success: true,
        showSlug,
        directory: showDir,
        images: [],
        imageCount: 0,
        hasPoster: false,
        message: 'No images directory found - will be created on first upload'
      })
    }
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to check image status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 