'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  BookText,
  FileImage,
  Loader2,
  Download,
  Printer,
  Sparkles,
  Layers,
  XCircle,
  Upload,
} from 'lucide-react';

import { generateTestPaper } from '@/ai/flows/generate-test-paper';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

export default function Home() {
  const { toast } = useToast();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [marks, setMarks] = useState('10');
  const [generatedTest, setGeneratedTest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      // Basic validation for image type
      for (const file of newFiles) {
        if (!file.type.startsWith('image/')) {
          toast({
            variant: 'destructive',
            title: 'Invalid File Type',
            description: 'Please upload only image files (e.g., PNG, JPG, WEBP).',
          });
          return;
        }
      }
      
      const currentFiles = [...imageFiles, ...newFiles];
      setImageFiles(currentFiles);

      const newPreviews: string[] = [];
      const filePromises = newFiles.map(file => {
        return new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            newPreviews.push(reader.result as string);
            resolve("");
          };
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises).then(() => {
        setImagePreviews([...imagePreviews, ...newPreviews]);
      });
    }
  };

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  }

  const handleGenerateTest = async () => {
    if (imageFiles.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No Images Selected',
        description: 'Please upload at least one image to generate a test paper.',
      });
      return;
    }
    
    if (!marks || parseInt(marks, 10) <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid Marks',
        description: 'Please enter a valid number for total marks.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedTest(null);

    try {
      const photoDataUris = await Promise.all(imageFiles.map(toBase64));
      const result = await generateTestPaper({
        photoDataUris,
        marks: parseInt(marks, 10),
      });
      setGeneratedTest(result.testPaper);
      toast({
        title: 'Success!',
        description: 'Your test paper has been generated.',
      });
    } catch (error) {
      console.error('Error generating test paper:', error);
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description:
          'Something went wrong. Please try again with a clearer image.',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownload = () => {
    if (!generatedTest) return;
    const blob = new Blob([generatedTest], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'test-paper.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
        title: 'Downloaded',
        description: 'The test paper has been saved as a text file.',
      });
  };

  const handlePrint = () => {
    if (!generatedTest) return;
    window.print();
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-center gap-2 p-4 border-b">
        <Layers className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-headline font-bold text-center">
          SnapTest AI Paper Generator
        </h1>
      </header>
      <main className="flex-1 p-4 md:p-8">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Input Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl flex items-center gap-2">
                <BookText />
                1. Create Your Test
              </CardTitle>
              <CardDescription>
                Upload one or more textbook pages and set the total marks.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label className="font-bold">
                  Upload Images
                </Label>
                <div>
                   <input
                    ref={fileInputRef}
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageChange}
                    multiple
                  />
                  <Button onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2" />
                    Upload Images
                  </Button>
                </div>

                {imagePreviews.length > 0 && (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {imagePreviews.map((src, index) => (
                      <div key={index} className="relative aspect-square">
                        <Image
                          src={src}
                          alt={`Selected preview ${index + 1}`}
                          layout="fill"
                          objectFit="cover"
                          className="rounded-lg"
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-6 w-6 rounded-full"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(index);
                          }}
                        >
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="marks-input" className="font-bold">Total Marks</Label>
                <Input
                  id="marks-input"
                  type="number"
                  value={marks}
                  onChange={(e) => setMarks(e.target.value)}
                  placeholder="E.g. 25"
                  min="1"
                  className="w-full max-w-xs"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerateTest}
                disabled={imageFiles.length === 0 || isLoading}
                className="w-full font-bold"
                size="lg"
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {isLoading ? 'Generating...' : 'Generate Test Paper'}
              </Button>
            </CardFooter>
          </Card>

          {/* Output Card */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="font-headline text-2xl">
                2. Generated Test Paper
              </CardTitle>
              <CardDescription>
                Preview your test below. You can download it or export to PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="min-h-[300px]">
              {isLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-12 w-full mt-4" />
                  <Skeleton className="h-6 w-1/2 mt-4" />
                  <Skeleton className="h-4 w-full" />
                </div>
              )}
              {generatedTest && (
                <div
                  id="printable-area"
                  className="prose dark:prose-invert max-w-none rounded-md border bg-secondary/30 p-4 h-96 overflow-y-auto"
                >
                  <pre className="font-body whitespace-pre-wrap text-sm">
                    {generatedTest}
                  </pre>
                </div>
              )}
              {!isLoading && !generatedTest && (
                <div className="flex h-full items-center justify-center text-center text-muted-foreground">
                  <p>Your generated test will appear here.</p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleDownload}
                disabled={!generatedTest || isLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Download (.txt)
              </Button>
              <Button
                onClick={handlePrint}
                disabled={!generatedTest || isLoading}
              >
                <Printer className="mr-2 h-4 w-4" />
                Export to PDF
              </Button>
            </CardFooter>
          </Card>
        </div>
      </main>
      <div className="pb-16" /> {/* Spacer for the ad banner */}
      <div className="fixed bottom-0 left-0 w-full bg-card/80 backdrop-blur-sm p-4 text-center text-lg text-muted-foreground border-t">
        Ad Banner Placeholder
      </div>
    </div>
  );
}
