"use client"

import { useState } from "react"
import {
  Play,
  RefreshCw,
  Settings,
  XCircle,
  CheckCircle,
  Info,
  Globe,
  Server,
  X,
  HelpCircle,
  Cpu,
  Clock,
  RotateCcw,
  AlertCircle,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

// Add a new scraping mode type that includes "specific-product"
type ScrapingMode = "complete" | "specific" | "specific-product"

// Update the LaunchTabProps type to include xmlSettings and updateXmlSettings
type LaunchTabProps = {
  launchConfig: {
    target: string
    threads: number
    retries: number
    timeout: number
  }
  handleConfigChange: (field: string, value: string | number) => void
  websiteSettings: Record<
    string,
    {
      scrapingMode: ScrapingMode
      specificCategoryUrl: string
      specificProductUrl: string
    }
  >
  updateWebsiteSettings: (website: string, field: string, value: any) => void
  xmlSettings: Record<
    string,
    {
      xmlLink: string
    }
  >
  updateXmlSettings: (source: string, field: string, value: any) => void
  isRunning: boolean
  error: string | null
  runProgress: number
  currentStep: string
  currentFunction: string
  launchScraper: () => Promise<void>
}

// Update the function parameters to include xmlSettings and updateXmlSettings
export default function LaunchTab({
  launchConfig,
  handleConfigChange,
  websiteSettings,
  updateWebsiteSettings,
  xmlSettings,
  updateXmlSettings,
  isRunning,
  error,
  runProgress,
  currentStep,
  currentFunction,
  launchScraper,
}: LaunchTabProps) {
  const [localError, setLocalError] = useState<string | null>(null)
  const [showHelp, setShowHelp] = useState(false)

  // Helper function to get current website settings
  const getCurrentWebsiteSettings = () => {
    return (
      websiteSettings[launchConfig.target] || {
        scrapingMode: "complete",
        specificCategoryUrl: "",
        specificProductUrl: "",
      }
    )
  }

  // Replace the entire return statement with this full-width layout
  return (
    <div className="space-y-8 max-w-full mx-auto">
      {/* Main Configuration Section */}
      <div className="overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-green-900/20 to-blue-900/20 p-6 border-b border-[#333]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Play className="mr-3 h-6 w-6 text-green-500" />
                Launch Configuration
              </h2>
              <p className="text-[#888] mt-1">Configure and run the web scraper</p>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-[#666] hover:text-green-500 hover:bg-green-900/20 rounded-full"
                    onClick={() => setShowHelp(!showHelp)}
                  >
                    <HelpCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Toggle help information</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        <div className="p-6 pt-8 bg-[#111]">
          <div className="space-y-8">
            {/* Target Selection */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Globe className="mr-2 h-5 w-5 text-green-500" /> Target Website
              </h3>

              <RadioGroup
                value={launchConfig.target}
                onValueChange={(value) => handleConfigChange("target", value)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                disabled={isRunning}
              >
                <div className="relative">
                  <RadioGroupItem value="xkom" id="xkom" className="peer sr-only" disabled={isRunning} />
                  <Label
                    htmlFor="xkom"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#1a1a1a] p-4 hover:bg-[#222] hover:border-green-500/50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-900/20 [&:has([data-state=checked])]:border-green-500 cursor-pointer transition-all duration-200"
                  >
                    <Globe className="mb-3 h-8 w-8 text-blue-500" />
                    <span className="font-medium text-white">X-Kom</span>
                    <span className="text-xs text-[#888] mt-1">Polish Tech Store</span>
                  </Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-[#333] hover:bg-[#444] text-[#ccc] transition-colors"
                        disabled={launchConfig.target !== "xkom" || isRunning}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111] border-[#333] text-white">
                      <DialogHeader>
                        <DialogTitle>X-Kom Scraping Settings</DialogTitle>
                        <DialogDescription className="text-[#888]">
                          Configure how the scraper will process X-Kom website
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <Tabs
                          defaultValue="complete"
                          value={websiteSettings.xkom?.scrapingMode || "complete"}
                          onValueChange={(value) =>
                            updateWebsiteSettings("xkom", "scrapingMode", value as ScrapingMode)
                          }
                        >
                          <TabsList className="grid grid-cols-3 bg-[#222]">
                            <TabsTrigger
                              value="complete"
                              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
                            >
                              Complete
                            </TabsTrigger>
                            <TabsTrigger
                              value="specific"
                              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
                            >
                              Category
                            </TabsTrigger>
                            <TabsTrigger
                              value="specific-product"
                              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
                            >
                              Product
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="complete" className="pt-4">
                            <p className="text-sm text-[#ccc]">
                              The scraper will start from the beginning, fetching all categories and then scraping
                              products.
                            </p>
                          </TabsContent>
                          <TabsContent value="specific" className="pt-4 space-y-4">
                            <p className="text-sm text-[#ccc]">
                              The scraper will only process the specific category URL you provide.
                            </p>
                            <div className="space-y-2">
                              <Label htmlFor="xkomCategoryUrl">Category URL</Label>
                              <Input
                                id="xkomCategoryUrl"
                                placeholder="https://www.x-kom.pl/g-4/c/1590-laptopy-notebooki-ultrabooki.html"
                                value={websiteSettings.xkom?.specificCategoryUrl || ""}
                                onChange={(e) => updateWebsiteSettings("xkom", "specificCategoryUrl", e.target.value)}
                                className="bg-[#222] border-[#333] text-white"
                              />
                              <p className="text-xs text-[#666]">
                                Paste the full URL of the category you want to scrape
                              </p>
                            </div>
                          </TabsContent>
                          <TabsContent value="specific-product" className="pt-4 space-y-4">
                            <p className="text-sm text-[#ccc]">
                              The scraper will only process the specific product URL you provide.
                            </p>
                            <div className="space-y-2">
                              <Label htmlFor="xkomProductUrl">Product URL</Label>
                              <Input
                                id="xkomProductUrl"
                                placeholder="https://www.x-kom.pl/p/123456-laptop-hp-pavilion.html"
                                value={websiteSettings.xkom?.specificProductUrl || ""}
                                onChange={(e) => updateWebsiteSettings("xkom", "specificProductUrl", e.target.value)}
                                className="bg-[#222] border-[#333] text-white"
                              />
                              <p className="text-xs text-[#666]">
                                Paste the full URL of the product you want to scrape
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
                          onClick={() => {
                            const settings = websiteSettings.xkom || {
                              scrapingMode: "complete",
                              specificCategoryUrl: "",
                              specificProductUrl: "",
                            }
                            if (settings.scrapingMode === "specific" && !settings.specificCategoryUrl) {
                              setLocalError("Please enter a category URL for specific category scraping")
                              return
                            }
                            if (settings.scrapingMode === "specific-product" && !settings.specificProductUrl) {
                              setLocalError("Please enter a product URL for specific product scraping")
                              return
                            }
                            setLocalError(null)
                          }}
                        >
                          Save Settings
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Vevor option */}
                <div className="relative">
                  <RadioGroupItem value="vevor" id="vevor" className="peer sr-only" disabled={isRunning} />
                  <Label
                    htmlFor="vevor"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#1a1a1a] p-4 hover:bg-[#222] hover:border-green-500/50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-900/20 [&:has([data-state=checked])]:border-green-500 cursor-pointer transition-all duration-200"
                  >
                    <Globe className="mb-3 h-8 w-8 text-orange-500" />
                    <span className="font-medium text-white">Vevor</span>
                    <span className="text-xs text-[#888] mt-1">Industrial Equipment</span>
                  </Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-[#333] hover:bg-[#444] text-[#ccc] transition-colors"
                        disabled={launchConfig.target !== "vevor" || isRunning}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111] border-[#333] text-white">
                      <DialogHeader>
                        <DialogTitle>Vevor Scraping Settings</DialogTitle>
                        <DialogDescription className="text-[#888]">
                          Configure how the scraper will process Vevor website
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <Tabs
                          defaultValue="complete"
                          value={websiteSettings.vevor?.scrapingMode || "complete"}
                          onValueChange={(value) =>
                            updateWebsiteSettings("vevor", "scrapingMode", value as ScrapingMode)
                          }
                        >
                          <TabsList className="grid grid-cols-3 bg-[#222]">
                            <TabsTrigger
                              value="complete"
                              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
                            >
                              Complete
                            </TabsTrigger>
                            <TabsTrigger
                              value="specific"
                              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
                            >
                              Category
                            </TabsTrigger>
                            <TabsTrigger
                              value="specific-product"
                              className="data-[state=active]:bg-green-900/30 data-[state=active]:text-green-500"
                            >
                              Product
                            </TabsTrigger>
                          </TabsList>
                          <TabsContent value="complete" className="pt-4">
                            <p className="text-sm text-[#ccc]">
                              The scraper will start from the beginning, fetching all categories and then scraping
                              products.
                            </p>
                          </TabsContent>
                          <TabsContent value="specific" className="pt-4 space-y-4">
                            <p className="text-sm text-[#ccc]">
                              The scraper will only process the specific category URL you provide.
                            </p>
                            <div className="space-y-2">
                              <Label htmlFor="vevorCategoryUrl">Category URL</Label>
                              <Input
                                id="vevorCategoryUrl"
                                placeholder="https://www.vevor.com/category/tools"
                                value={websiteSettings.vevor?.specificCategoryUrl || ""}
                                onChange={(e) => updateWebsiteSettings("vevor", "specificCategoryUrl", e.target.value)}
                                className="bg-[#222] border-[#333] text-white"
                              />
                              <p className="text-xs text-[#666]">
                                Paste the full URL of the category you want to scrape
                              </p>
                            </div>
                          </TabsContent>
                          <TabsContent value="specific-product" className="pt-4 space-y-4">
                            <p className="text-sm text-[#ccc]">
                              The scraper will only process the specific product URL you provide.
                            </p>
                            <div className="space-y-2">
                              <Label htmlFor="vevorProductUrl">Product URL</Label>
                              <Input
                                id="vevorProductUrl"
                                placeholder="https://www.vevor.com/products/example-product"
                                value={websiteSettings.vevor?.specificProductUrl || ""}
                                onChange={(e) => updateWebsiteSettings("vevor", "specificProductUrl", e.target.value)}
                                className="bg-[#222] border-[#333] text-white"
                              />
                              <p className="text-xs text-[#666]">
                                Paste the full URL of the product you want to scrape
                              </p>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
                          onClick={() => {
                            const settings = websiteSettings.vevor || {
                              scrapingMode: "complete",
                              specificCategoryUrl: "",
                              specificProductUrl: "",
                            }
                            if (settings.scrapingMode === "specific" && !settings.specificCategoryUrl) {
                              setLocalError("Please enter a category URL for specific category scraping")
                              return
                            }
                            if (settings.scrapingMode === "specific-product" && !settings.specificProductUrl) {
                              setLocalError("Please enter a product URL for specific product scraping")
                              return
                            }
                            setLocalError(null)
                          }}
                        >
                          Save Settings
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* All Sites option */}
                <div className="relative">
                  <RadioGroupItem value="all" id="all" className="peer sr-only" disabled={isRunning} />
                  <Label
                    htmlFor="all"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#1a1a1a] p-4 hover:bg-[#222] hover:border-green-500/50 peer-data-[state=checked]:border-green-500 peer-data-[state=checked]:bg-green-900/20 [&:has([data-state=checked])]:border-green-500 cursor-pointer transition-all duration-200"
                  >
                    <Server className="mb-3 h-8 w-8 text-green-500" />
                    <span className="font-medium text-white">All Sites</span>
                    <span className="text-xs text-[#888] mt-1">Run on all targets</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Add a new section for XML sources after the Target Selection section in the return statement */}
            {/* Add this after the Target Website section and before the Performance Settings section */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Server className="mr-2 h-5 w-5 text-purple-500" /> From XML
              </h3>

              <RadioGroup
                value={launchConfig.target}
                onValueChange={(value) => handleConfigChange("target", value)}
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                disabled={isRunning}
              >
                {/* Geek.com XML option */}
                <div className="relative">
                  <RadioGroupItem value="geek_xml" id="geek_xml" className="peer sr-only" disabled={isRunning} />
                  <Label
                    htmlFor="geek_xml"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-[#333] bg-[#1a1a1a] p-4 hover:bg-[#222] hover:border-purple-500/50 peer-data-[state=checked]:border-purple-500 peer-data-[state=checked]:bg-purple-900/20 [&:has([data-state=checked])]:border-purple-500 cursor-pointer transition-all duration-200"
                  >
                    <Server className="mb-3 h-8 w-8 text-purple-500" />
                    <span className="font-medium text-white">Geek.com</span>
                    <span className="text-xs text-[#888] mt-1">XML Feed</span>
                  </Label>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7 rounded-full bg-[#333] hover:bg-[#444] text-[#ccc] transition-colors"
                        disabled={launchConfig.target !== "geek_xml" || isRunning}
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#111] border-[#333] text-white">
                      <DialogHeader>
                        <DialogTitle>Geek.com XML Feed Settings</DialogTitle>
                        <DialogDescription className="text-[#888]">
                          Configure the XML feed URL for Geek.com products
                        </DialogDescription>
                      </DialogHeader>
                      <div className="py-4 space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="geekXmlLink">XML Feed URL</Label>
                          <Input
                            id="geekXmlLink"
                            placeholder="https://www.geek.com/feed/products.xml"
                            value={xmlSettings.geek?.xmlLink || ""}
                            onChange={(e) => updateXmlSettings("geek", "xmlLink", e.target.value)}
                            className="bg-[#222] border-[#333] text-white"
                          />
                          <p className="text-xs text-[#666]">Paste the full URL of the XML feed you want to parse</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          className="bg-[#222] border-[#333] hover:bg-[#333] text-[#ccc]"
                          onClick={() => {
                            if (!xmlSettings.geek?.xmlLink) {
                              setLocalError("Please enter an XML feed URL")
                              return
                            }
                            setLocalError(null)
                          }}
                        >
                          Save Settings
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </RadioGroup>
            </div>

            <Separator className="bg-[#333]" />

            {/* Performance Settings */}
            <div>
              <h3 className="text-lg font-medium text-white mb-4 flex items-center">
                <Cpu className="mr-2 h-5 w-5 text-green-500" /> Performance Settings
                {launchConfig.target === "geek_xml" && (
                  <Badge variant="outline" className="ml-2 bg-purple-900/20 text-purple-400 border-purple-800">
                    Not applicable for XML feeds
                  </Badge>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Threads Select */}
                <div
                  className={`space-y-3 bg-[#1a1a1a] p-4 rounded-lg border border-[#333] ${launchConfig.target === "geek_xml" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="threads" className="text-[#ccc] flex items-center">
                      <Cpu className="h-4 w-4 mr-2 text-blue-500" /> Threads
                    </Label>
                    <Badge variant="outline" className="bg-blue-900/20 text-blue-400 border-blue-800">
                      {launchConfig.threads}
                    </Badge>
                  </div>
                  <Select
                    value={launchConfig.threads.toString()}
                    onValueChange={(value) => handleConfigChange("threads", Number.parseInt(value))}
                    disabled={isRunning || launchConfig.target === "geek_xml"}
                  >
                    <SelectTrigger id="threads" className="bg-[#222] border-[#333] focus:ring-green-500/50">
                      <SelectValue placeholder="Select threads" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222] border-[#333] text-white">
                      {[1, 2, 3, 5, 7, 10, 15, 20].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#666]">Number of concurrent tasks to run in parallel</p>
                </div>

                {/* Retries Select */}
                <div
                  className={`space-y-3 bg-[#1a1a1a] p-4 rounded-lg border border-[#333] ${launchConfig.target === "geek_xml" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="retries" className="text-[#ccc] flex items-center">
                      <RotateCcw className="h-4 w-4 mr-2 text-orange-500" /> Retries
                    </Label>
                    <Badge variant="outline" className="bg-orange-900/20 text-orange-400 border-orange-800">
                      {launchConfig.retries}
                    </Badge>
                  </div>
                  <Select
                    value={launchConfig.retries.toString()}
                    onValueChange={(value) => handleConfigChange("retries", Number.parseInt(value))}
                    disabled={isRunning || launchConfig.target === "geek_xml"}
                  >
                    <SelectTrigger id="retries" className="bg-[#222] border-[#333] focus:ring-green-500/50">
                      <SelectValue placeholder="Select retries" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222] border-[#333] text-white">
                      {[0, 1, 2, 3, 5].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#666]">Number of retry attempts on failure</p>
                </div>

                {/* Timeout Select */}
                <div
                  className={`space-y-3 bg-[#1a1a1a] p-4 rounded-lg border border-[#333] ${launchConfig.target === "geek_xml" ? "opacity-50" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <Label htmlFor="timeout" className="text-[#ccc] flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-purple-500" /> Timeout
                    </Label>
                    <Badge variant="outline" className="bg-purple-900/20 text-purple-400 border-purple-800">
                      {launchConfig.timeout / 1000}s
                    </Badge>
                  </div>
                  <Select
                    value={launchConfig.timeout.toString()}
                    onValueChange={(value) => handleConfigChange("timeout", Number.parseInt(value))}
                    disabled={isRunning || launchConfig.target === "geek_xml"}
                  >
                    <SelectTrigger id="timeout" className="bg-[#222] border-[#333] focus:ring-green-500/50">
                      <SelectValue placeholder="Select timeout" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#222] border-[#333] text-white">
                      {[15000, 20000, 30000, 45000, 60000, 90000, 120000].map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value / 1000}s
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-[#666]">Maximum time to wait for a response</p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {(error || localError) && (
              <Alert variant="destructive" className="mt-6 bg-red-900/20 border-red-800 text-red-300">
                <XCircle className="h-4 w-4 mr-2" />
                <AlertDescription className="font-mono">{error || localError}</AlertDescription>
              </Alert>
            )}

            {/* Progress Indicator */}
            {isRunning && (
              <div className="mt-6 space-y-4">
                <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 font-mono text-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-orange-500 flex items-center">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      <span className="text-base">{currentStep}</span>
                    </div>
                    <Badge variant="outline" className="bg-green-900/20 text-green-500 border-green-500/30">
                      {currentFunction || "Initializing..."}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-xs text-[#888]">
                      <span>Progress:</span>
                      <span>{Math.round(runProgress)}%</span>
                    </div>
                    <div className="relative h-3 w-full bg-[#222] rounded-full overflow-hidden">
                      <div
                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full transition-all duration-300"
                        style={{ width: `${runProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-[#666] italic mt-2">
                      {runProgress < 30 && "Initializing scraper..."}
                      {runProgress >= 30 && runProgress < 60 && "Collecting product links..."}
                      {runProgress >= 60 && runProgress < 90 && "Scraping product details..."}
                      {runProgress >= 90 && "Finalizing and processing data..."}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-between border-t border-[#333] p-6 bg-[#0a0a0a]">
          <div className="text-xs text-[#888] italic max-w-md">
            {launchConfig.target === "all"
              ? "Will run all functions sequentially on all sites with their individual settings"
              : getCurrentWebsiteSettings().scrapingMode === "complete"
                ? "Will run all functions sequentially on selected site"
                : getCurrentWebsiteSettings().scrapingMode === "specific"
                  ? "Will start from the second function with the provided category URL"
                  : "Will scrape only the specific product URL"}
          </div>
          <div className="flex space-x-3">
            {isRunning && (
              <Button
                onClick={() => window.dispatchEvent(new CustomEvent("cancel-scraper"))}
                className="bg-red-900/30 hover:bg-red-900/50 text-red-500 border border-red-500/30"
              >
                <span className="flex items-center">
                  <X className="mr-2 h-4 w-4" /> Cancel
                </span>
              </Button>
            )}
            <Button
              onClick={launchScraper}
              disabled={isRunning || !isValidConfiguration(launchConfig.target, websiteSettings)}
              className={`${
                isRunning
                  ? "bg-[#222] text-[#666] cursor-not-allowed"
                  : "bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
              } 
                transition-all duration-200 shadow-lg`}
              size="lg"
            >
              {isRunning ? (
                <span className="flex items-center">
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Running...
                </span>
              ) : (
                <span className="flex items-center">
                  <Play className="mr-2 h-4 w-4" /> Launch Scraper
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Execution Flow Section */}
      <div className="overflow-hidden shadow-lg bg-[#111] border border-[#333]">
        <div className="border-b border-[#333] bg-gradient-to-r from-blue-900/20 to-purple-900/20 p-6">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Info className="mr-2 h-5 w-5 text-blue-500" /> Execution Flow
          </h2>
        </div>
        <div className="p-6">
          <div className="space-y-6">
            <div className="bg-[#1a1a1a] border border-[#333] rounded-lg p-6 font-mono text-sm">
              {launchConfig.target === "geek_xml" ? (
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-900/30 flex items-center justify-center text-purple-500 mr-4 mt-1">
                      1
                    </div>
                    <div>
                      <div className="text-white font-medium">parseGeekXml</div>
                      <div className="text-purple-500 mt-1">Parses products from Geek.com XML feed</div>
                    </div>
                  </div>
                </div>
              ) : launchConfig.target !== "all" ? (
                getCurrentWebsiteSettings().scrapingMode === "complete" ? (
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 mr-4 mt-1">
                        1
                      </div>
                      <div>
                        <div className="text-white font-medium">getCatalogLinks</div>
                        <div className="text-green-500 mt-1">Extracts subcategory links from the main site</div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 mr-4 mt-1">
                        2
                      </div>
                      <div>
                        <div className="text-white font-medium">getCatalogPagesLinks</div>
                        <div className="text-green-500 mt-1">Extracts product links from categories</div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 mr-4 mt-1">
                        3
                      </div>
                      <div>
                        <div className="text-white font-medium">scrapeProductLinks</div>
                        <div className="text-green-500 mt-1">Extracts product details from product links</div>
                      </div>
                    </div>
                  </div>
                ) : getCurrentWebsiteSettings().scrapingMode === "specific" ? (
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 mr-4 mt-1">
                        1
                      </div>
                      <div>
                        <div className="text-white font-medium">getCatalogPagesLinks</div>
                        <div className="text-green-500 mt-1">Extracts product links from specific category URL</div>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 mr-4 mt-1">
                        2
                      </div>
                      <div>
                        <div className="text-white font-medium">scrapeProductLinks</div>
                        <div className="text-green-500 mt-1">Extracts product details from product links</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-start">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-900/30 flex items-center justify-center text-green-500 mr-4 mt-1">
                        1
                      </div>
                      <div>
                        <div className="text-white font-medium">scrapeProductLinks</div>
                        <div className="text-green-500 mt-1">
                          Extracts product details from the specific product URL
                        </div>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="p-4 bg-blue-900/10 border border-blue-900/30 rounded-lg text-[#ccc]">
                  <div className="flex items-start">
                    <Info className="h-5 w-5 text-blue-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      When 'All Sites' is selected, the functions will run sequentially for each site according to their
                      individual settings. Each website will be processed with its own configuration.
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#333] flex items-center">
                <Badge className="bg-green-900/20 text-green-500 border-green-500/30 mr-3">
                  {launchConfig.target !== "all"
                    ? getCurrentWebsiteSettings().scrapingMode === "complete"
                      ? "Complete Mode"
                      : getCurrentWebsiteSettings().scrapingMode === "specific"
                        ? "Specific Category Mode"
                        : "Specific Product Mode"
                    : "Multi-Site Mode"}
                </Badge>
                <span className="text-[#888]">
                  {launchConfig.target !== "all"
                    ? getCurrentWebsiteSettings().scrapingMode === "complete"
                      ? "Will process all categories and products"
                      : getCurrentWebsiteSettings().scrapingMode === "specific"
                        ? "Will only process the provided category URL"
                        : "Will only process the provided product URL"
                    : "Each website will be processed according to its individual settings"}
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-[#ccc] bg-[#1a1a1a] p-4 rounded-lg border border-[#333]">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span>Results are automatically saved to the execution history sidebar</span>
            </div>
          </div>
        </div>
      </div>

      {/* Help section that can be toggled */}
      {showHelp && (
        <div className="overflow-hidden shadow-lg bg-[#111] border border-[#333]">
          <div className="border-b border-[#333] bg-gradient-to-r from-purple-900/20 to-indigo-900/20 p-6">
            <h2 className="text-xl font-bold text-white flex items-center">
              <HelpCircle className="mr-2 h-5 w-5 text-purple-500" /> Help & Tips
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 bg-[#1a1a1a] p-5 rounded-lg border border-[#333]">
                <h3 className="text-base font-medium text-white flex items-center">
                  <Globe className="h-4 w-4 mr-2 text-blue-500" /> Target Selection
                </h3>
                <p className="text-sm text-[#ccc]">
                  Choose a specific website to scrape or select "All Sites" to run the scraper on all available targets.
                  Click the settings icon to configure site-specific options.
                </p>
              </div>

              <div className="space-y-4 bg-[#1a1a1a] p-5 rounded-lg border border-[#333]">
                <h3 className="text-base font-medium text-white flex items-center">
                  <Settings className="h-4 w-4 mr-2 text-orange-500" /> Scraping Modes
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-[#ccc]">
                    <span className="text-green-500 font-medium">Complete Scraping:</span> Starts from the main page,
                    discovers all categories, and then scrapes products. This is more thorough but takes longer.
                  </p>
                  <p className="text-[#ccc]">
                    <span className="text-green-500 font-medium">Specific Category:</span> Scrapes only the category URL
                    you provide. Faster but limited to a single category.
                  </p>
                  <p className="text-[#ccc]">
                    <span className="text-green-500 font-medium">Specific Product:</span> Scrapes only the product URL
                    you provide. Fastest option when you only need data for one product.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-[#1a1a1a] p-5 rounded-lg border border-[#333]">
                <h3 className="text-base font-medium text-white flex items-center">
                  <Cpu className="h-4 w-4 mr-2 text-blue-500" /> Performance Settings
                </h3>
                <div className="space-y-2 text-sm">
                  <p className="text-[#ccc]">
                    <span className="text-green-500 font-medium">Threads:</span> Higher values increase speed but may
                    cause rate limiting. Start with 5-7 for most sites.
                  </p>
                  <p className="text-[#ccc]">
                    <span className="text-green-500 font-medium">Retries:</span> Number of times to retry failed
                    requests. Set to 1-2 for most cases.
                  </p>
                  <p className="text-[#ccc]">
                    <span className="text-green-500 font-medium">Timeout:</span> Maximum time to wait for a response.
                    Increase for slower sites or complex pages.
                  </p>
                </div>
              </div>

              <div className="space-y-4 bg-[#1a1a1a] p-5 rounded-lg border border-[#333]">
                <h3 className="text-base font-medium text-white flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2 text-red-500" /> Troubleshooting
                </h3>
                <ul className="text-sm text-[#ccc] space-y-2 list-disc pl-5">
                  <li>If you encounter many timeouts, try reducing thread count and increasing timeout value</li>
                  <li>For specific category mode, ensure the URL is a valid category page</li>
                  <li>For specific product mode, ensure the URL is a valid product page</li>
                  <li>The "Cancel" button will safely stop the current operation</li>
                  <li>Check the Logs tab after a run to diagnose any issues</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Update the isValidConfiguration function to check XML settings
// Replace the entire isValidConfiguration function at the bottom of the file
function isValidConfiguration(target: string, websiteSettings: Record<string, any>): boolean {
  // For XML targets
  if (target === "geek_xml") {
    return true // XML validation is handled separately
  }

  // For website targets
  if (target === "all") return true

  const settings = websiteSettings[target]
  if (!settings) return true // Default to complete mode if no settings

  if (settings.scrapingMode === "specific" && !settings.specificCategoryUrl) {
    return false
  }

  if (settings.scrapingMode === "specific-product" && !settings.specificProductUrl) {
    return false
  }

  return true
}
