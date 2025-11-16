import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { I5HPEssayQuestion, IH5PEssayKeyword } from "@/types/MaterialEditor";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface EssayEditableProps {
  question: I5HPEssayQuestion;
  questionNumber: number;
  onUpdate: (updatedQuestion: I5HPEssayQuestion) => void;
  onDelete?: () => void;
}

export function EssayEditable({
  question,
  questionNumber,
  onUpdate,
  onDelete,
}: EssayEditableProps) {
  const [expandedKeywords, setExpandedKeywords] = useState<Set<number>>(new Set());

  const handleTaskDescriptionChange = (newText: string) => {
    onUpdate({
      ...question,
      params: {
        ...question.params,
        taskDescription: newText,
      },
    });
  };

  const handleKeywordChange = (index: number, field: keyof IH5PEssayKeyword, value: string | string[]) => {
    const newKeywords = [...question.params.keywords];
    newKeywords[index] = {
      ...newKeywords[index],
      [field]: value,
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const handleKeywordOptionChange = (
    index: number,
    field: keyof IH5PEssayKeyword["options"],
    value: string | number | boolean
  ) => {
    const newKeywords = [...question.params.keywords];
    newKeywords[index] = {
      ...newKeywords[index],
      options: {
        ...newKeywords[index].options,
        [field]: value,
      },
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const handleAddKeyword = () => {
    const newKeywords = [
      ...question.params.keywords,
      {
        keyword: "New keyword",
        alternatives: [],
        options: {
          points: 1,
          occurrences: 1,
          caseSensitive: false,
          forgiveMistakes: true,
          feedbackIncluded: "",
          feedbackMissed: "",
          feedbackIncludedWord: "keyword" as const,
          feedbackMissedWord: "keyword" as const,
        },
      },
    ];
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const handleDeleteKeyword = (index: number) => {
    if (question.params.keywords.length <= 1) {
      return; // Don't allow deleting the last keyword
    }

    const newKeywords = question.params.keywords.filter((_, i) => i !== index);
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const handleAddAlternative = (keywordIndex: number) => {
    const newKeywords = [...question.params.keywords];
    const currentAlternatives = newKeywords[keywordIndex].alternatives || [];
    newKeywords[keywordIndex] = {
      ...newKeywords[keywordIndex],
      alternatives: [...currentAlternatives, ""],
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const handleAlternativeChange = (keywordIndex: number, altIndex: number, value: string) => {
    const newKeywords = [...question.params.keywords];
    const alternatives = [...(newKeywords[keywordIndex].alternatives || [])];
    alternatives[altIndex] = value;
    newKeywords[keywordIndex] = {
      ...newKeywords[keywordIndex],
      alternatives,
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const handleDeleteAlternative = (keywordIndex: number, altIndex: number) => {
    const newKeywords = [...question.params.keywords];
    const alternatives = (newKeywords[keywordIndex].alternatives || []).filter(
      (_, i) => i !== altIndex
    );
    newKeywords[keywordIndex] = {
      ...newKeywords[keywordIndex],
      alternatives,
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        keywords: newKeywords,
      },
    });
  };

  const toggleKeywordExpanded = (index: number) => {
    const newExpanded = new Set(expandedKeywords);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedKeywords(newExpanded);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-lg font-semibold mb-2">
            Question {questionNumber}
          </CardTitle>
          {onDelete && (
            <Button
              variant="link"
              size="icon"
              onClick={onDelete}
              aria-label="Delete question"
              className="w-fit h-fit cursor-pointer text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Label className="text-sm font-normal text-muted-foreground">Task Description</Label>
        <Textarea
          value={question.params.taskDescription}
          onChange={(e) => handleTaskDescriptionChange(e.target.value)}
          autoFocus
          className="text-sm py-1 border-text-muted-foreground min-h-[80px]"
          placeholder="Enter the essay question or task description..."
        />
      </CardHeader>

      <CardContent>
        <div className="mb-4">
          <Label className="text-base font-semibold">Keywords</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Define keywords that should appear in student answers
          </p>
        </div>

        {/* Keywords */}
        {question.params.keywords.map((keyword, index) => (
          <div key={index} className="mb-4">
            <div className="flex items-center justify-between w-full mb-2">
              <Label className="text-sm font-medium">
                Keyword {index + 1}
              </Label>
              <Button
                variant="link"
                size="icon"
                onClick={() => handleDeleteKeyword(index)}
                disabled={question.params.keywords.length <= 1}
                className="cursor-pointer h-fit w-fit text-destructive hover:text-destructive disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Input
              value={keyword.keyword}
              onChange={(e) => handleKeywordChange(index, "keyword", e.target.value)}
              placeholder="Keyword text"
              className="text-sm mb-2"
            />

            {/* Alternatives */}
            <div className="pl-4 border-l-2 border-muted space-y-2 mb-2">
              <Label className="text-xs font-normal text-muted-foreground">
                Alternatives (optional)
              </Label>
              {keyword.alternatives?.map((alt, altIndex) => (
                <div key={altIndex} className="flex gap-2">
                  <Input
                    value={alt}
                    onChange={(e) =>
                      handleAlternativeChange(index, altIndex, e.target.value)
                    }
                    placeholder="Alternative phrase"
                    className="text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteAlternative(index, altIndex)}
                    className="cursor-pointer h-8 w-8"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddAlternative(index)}
                className="cursor-pointer w-full text-xs"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Alternative
              </Button>
            </div>

            {/* Keyword Options - Collapsible */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleKeywordExpanded(index)}
              className="cursor-pointer w-full text-xs mb-2"
            >
              {expandedKeywords.has(index) ? "Hide" : "Show"} Advanced Options
            </Button>

            {expandedKeywords.has(index) && (
              <div className="pl-4 border-l-2 border-muted space-y-3 mt-2">
                {/* Points */}
                <div>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Points
                  </Label>
                  <Input
                    type="number"
                    value={keyword.options.points}
                    onChange={(e) =>
                      handleKeywordOptionChange(index, "points", parseInt(e.target.value) || 0)
                    }
                    className="text-xs mt-1"
                    min="0"
                  />
                </div>

                {/* Occurrences */}
                <div>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Required Occurrences
                  </Label>
                  <Input
                    type="number"
                    value={keyword.options.occurrences}
                    onChange={(e) =>
                      handleKeywordOptionChange(index, "occurrences", parseInt(e.target.value) || 1)
                    }
                    className="text-xs mt-1"
                    min="1"
                  />
                </div>

                {/* Case Sensitive */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`case-sensitive-${index}`}
                    checked={keyword.options.caseSensitive}
                    onChange={(e) =>
                      handleKeywordOptionChange(index, "caseSensitive", e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer"
                  />
                  <Label
                    htmlFor={`case-sensitive-${index}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    Case Sensitive
                  </Label>
                </div>

                {/* Forgive Mistakes */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`forgive-mistakes-${index}`}
                    checked={keyword.options.forgiveMistakes}
                    onChange={(e) =>
                      handleKeywordOptionChange(index, "forgiveMistakes", e.target.checked)
                    }
                    className="h-4 w-4 cursor-pointer"
                  />
                  <Label
                    htmlFor={`forgive-mistakes-${index}`}
                    className="text-xs font-normal cursor-pointer"
                  >
                    Forgive Spelling Mistakes
                  </Label>
                </div>

                {/* Feedback Included */}
                <div>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Feedback When Included
                  </Label>
                  <Input
                    value={keyword.options.feedbackIncluded || ""}
                    onChange={(e) =>
                      handleKeywordOptionChange(index, "feedbackIncluded", e.target.value)
                    }
                    placeholder="Feedback when keyword is found"
                    className="text-xs mt-1"
                  />
                </div>

                {/* Feedback Included Word */}
                <div>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Feedback Included Word Type
                  </Label>
                  <Select
                    value={keyword.options.feedbackIncludedWord}
                    onValueChange={(value) =>
                      handleKeywordOptionChange(index, "feedbackIncludedWord", value)
                    }
                  >
                    <SelectTrigger className="border-text-muted-foreground text-xs mt-1">
                      <SelectValue placeholder="Select word type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="alternative">Alternative</SelectItem>
                      <SelectItem value="answer">Answer</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Feedback Missed */}
                <div>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Feedback When Missed
                  </Label>
                  <Input
                    value={keyword.options.feedbackMissed || ""}
                    onChange={(e) =>
                      handleKeywordOptionChange(index, "feedbackMissed", e.target.value)
                    }
                    placeholder="Feedback when keyword is missing"
                    className="text-xs mt-1"
                  />
                </div>

                {/* Feedback Missed Word */}
                <div>
                  <Label className="text-xs font-normal text-muted-foreground">
                    Feedback Missed Word Type
                  </Label>
                  <Select
                    value={keyword.options.feedbackMissedWord}
                    onValueChange={(value) =>
                      handleKeywordOptionChange(index, "feedbackMissedWord", value)
                    }
                  >
                    <SelectTrigger className="border-text-muted-foreground text-xs mt-1">
                      <SelectValue placeholder="Select word type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keyword">Keyword</SelectItem>
                      <SelectItem value="none">None</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Separator className="my-4" />
          </div>
        ))}

        {/* Add Keyword Button */}
        <Button
          variant="outline"
          onClick={handleAddKeyword}
          className="cursor-pointer w-full mt-4"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Keyword
        </Button>
      </CardContent>
    </Card>
  );
}
