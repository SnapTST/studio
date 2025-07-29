'use client';

import { useState, useRef, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  BookText,
  Loader2,
  Download,
  Sparkles,
  Layers,
  XCircle,
  Upload,
  Printer,
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

// Helper to convert file to Base64
const toBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });

const QUESTION_TYPES = [
  { id: 'mcq', label: 'Multiple Choice' },
  { id: 'short-answer', label: 'Short Answer' },
  { id: 'essay', label: 'Essay' },
  { id: 'fill-in-the-blanks', label: 'Fill in the Blanks' },
  { id: 'true-false', label: 'True/False' },
  { id: 'matching', label: 'Matching' },
  { id: 'definitions', label: 'Definitions' },
  { id: 'diagram', label: 'Diagram Questions' },
  { id: 'problem-solving', label: 'Problem Solving' },
  { id: 'case-study', label: 'Case Study' },
];

const LANGUAGES = [
    { value: 'English', label: 'English' },
    { value: 'Assamese', label: 'Assamese' },
    { value: 'Bengali', label: 'Bengali' },
    { value: 'Bodo', label: 'Bodo' },
    { value: 'Dogri', label: 'Dogri' },
    { value: 'Gujarati', label: 'Gujarati' },
    { value: 'Hindi', label: 'Hindi' },
    { value: 'Kannada', label: 'Kannada' },
    { value: 'Kashmiri', label: 'Kashmiri' },
    { value: 'Konkani', label: 'Konkani' },
    { value: 'Maithili', label: 'Maithili' },
    { value: 'Malayalam', label: 'Malayalam' },
    { value: 'Manipuri', label: 'Manipuri' },
    { value: 'Marathi', label: 'Marathi' },
    { value: 'Nepali', label: 'Nepali' },
    { value: 'Odia', label: 'Odia' },
    { value: 'Punjabi', label: 'Punjabi' },
    { value: 'Sanskrit', label: 'Sanskrit' },
    { value: 'Santali', label: 'Santali' },
    { value: 'Sindhi', label: 'Sindhi' },
    { value: 'Tamil', label: 'Tamil' },
    { value: 'Telugu', label: 'Telugu' },
    { value: 'Urdu', label: 'Urdu' },
];


export default function Home() {
  const { toast } = useToast();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [marks, setMarks] = useState('10');
  const [language, setLanguage] = useState('English');
  const [examFormat, setExamFormat] = useState('');
  const [questionTypes, setQuestionTypes] = useState<string[]>([]);
  const [generatedTest, setGeneratedTest] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formatFileInputRef = useRef<HTMLInputElement>(null);
  const [formatImageFile, setFormatImageFile] = useState<File | null>(null);
  const [formatImagePreview, setFormatImagePreview] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  const handleFormatImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Invalid File Type',
          description: 'Please upload an image file for the format.',
        });
        return;
      }
      setFormatImageFile(file);
      toBase64(file).then(setFormatImagePreview);
    }
  }

  const removeImage = (index: number) => {
    const newFiles = [...imageFiles];
    newFiles.splice(index, 1);
    setImageFiles(newFiles);

    const newPreviews = [...imagePreviews];
    newPreviews.splice(index, 1);
    setImagePreviews(newPreviews);
  }

  const removeFormatImage = () => {
    setFormatImageFile(null);
    setFormatImagePreview(null);
  }

  const handleQuestionTypeChange = (checked: boolean, typeLabel: string) => {
    setQuestionTypes(prev => 
      checked ? [...prev, typeLabel] : prev.filter(t => t !== typeLabel)
    );
  };

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
    setShowPreview(false);

    try {
      const photoDataUris = await Promise.all(imageFiles.map(toBase64));
      const formatPhotoDataUri = formatImageFile ? await toBase64(formatImageFile) : undefined;

      const result = await generateTestPaper({
        photoDataUris,
        marks: parseInt(marks, 10),
        language,
        examFormat,
        questionTypes,
        formatPhotoDataUri,
      });
      setGeneratedTest(result.testPaper);
      setShowPreview(true);
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
  
  const handlePrint = () => {
    window.print();
  }

  const handleDownload = () => {
    if (!generatedTest) return;
    const blob = new Blob([generatedTest], { type: 'text/plain;charset=utf-8' });
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

  if (showPreview) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
          <Card className="max-w-4xl mx-auto shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="font-headline text-2xl">Generated Test Paper</CardTitle>
                    <CardDescription>Preview, print, or download your test paper.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowPreview(false)}>Back to Editor</Button>
                    <Button onClick={handlePrint}>
                      <Printer className="mr-2 h-4 w-4" />
                      Print
                    </Button>
                     <Button onClick={handleDownload}>
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </div>
              </CardHeader>
              <CardContent>
                  <ScrollArea className="h-[70vh] rounded-md border p-4" id="printable-area">
                      <pre className="whitespace-pre-wrap font-sans text-sm">{generatedTest}</pre>
                  </ScrollArea>
              </CardContent>
          </Card>
      </div>
    );
  }


  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="flex items-center justify-center gap-2 p-4 border-b">
        <Layers className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-headline font-bold text-center">
          SnapTest AI Paper Generator
        </h1>
      </header>
      <div className="flex justify-center p-2 border-b bg-card">
          <Image
              src="https://placehold.co/468x60.png"
              alt="Advertisement"
              width={468}
              height={60}
              data-ai-hint="advertisement banner"
          />
      </div>
      <main className="flex-1 p-4 md:p-8">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 grid gap-8 content-start">
            {/* Input Card */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="font-headline text-2xl flex items-center gap-2">
                  <BookText />
                  1. Create Your Test
                </CardTitle>
                <CardDescription>
                  Upload textbook pages, set marks, and customize the format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label className="font-bold">
                    Upload Textbook Pages
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
                            fill
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
                
                <div className="grid md:grid-cols-2 gap-6">
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
                  <div className="space-y-2">
                    <Label htmlFor="language-select" className="font-bold">Language</Label>
                    <Select value={language} onValueChange={setLanguage}>
                        <SelectTrigger id="language-select" className="w-full max-w-xs">
                            <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                            {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.value} value={lang.value}>
                                    {lang.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="font-bold">Question Types</Label>
                    <div className="flex flex-wrap gap-4 items-center">
                      {QUESTION_TYPES.map(type => (
                        <div key={type.id} className="flex items-center gap-2">
                          <Checkbox
                            id={type.id}
                            onCheckedChange={(checked) => handleQuestionTypeChange(checked as boolean, type.label)}
                          />
                          <Label htmlFor={type.id} className="font-normal">{type.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="exam-format-input" className="font-bold">Exam Format (Optional)</Label>
                    <Textarea
                      id="exam-format-input"
                      value={examFormat}
                      onChange={(e) => setExamFormat(e.target.value)}
                      placeholder="e.g., 'Section A contains 10 multiple choice questions...' or upload a format image below."
                      className="min-h-[100px]"
                    />
                    <div className="space-y-4">
                        <Label className="font-bold">
                            Upload Format Image
                        </Label>
                        <div>
                            <input
                            ref={formatFileInputRef}
                            id="format-image-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFormatImageChange}
                            />
                            <Button variant="secondary" onClick={() => formatFileInputRef.current?.click()}>
                                <Upload className="mr-2" />
                                Upload Format Image
                            </Button>
                        </div>

                        {formatImagePreview && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            <div className="relative aspect-square">
                                <Image
                                src={formatImagePreview}
                                alt="Format preview"
                                fill
                                objectFit="cover"
                                className="rounded-lg"
                                />
                                <Button
                                variant="destructive"
                                size="icon"
                                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFormatImage();
                                }}
                                >
                                <XCircle className="h-4 w-4" />
                                </Button>
                            </div>
                            </div>
                        )}
                    </div>
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

          </div>
          <div className="hidden lg:flex justify-center items-start">
            <Image
                src="https://placehold.co/160x600.png"
                alt="Advertisement"
                width={160}
                height={600}
                data-ai-hint="advertisement banner"
                className="sticky top-8"
            />
          </div>
        </div>
      </main>
      <div className="pb-16" /> {/* Spacer for the ad banner */}
      <div className="fixed bottom-0 left-0 w-full flex justify-center bg-card/80 backdrop-blur-sm p-2 border-t">
        <Image
            src="https://placehold.co/728x90.png"
            alt="Advertisement"
            width={728}
            height={90}
            data-ai-hint="advertisement banner"
        />
      </div>
    </div>
  );
}
