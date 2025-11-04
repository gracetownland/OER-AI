import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IH5PQuestion } from "@/types/MaterialEditor";
import { Separator } from "../ui/separator";
import { Label } from "../ui/label";
import { CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface MCQEditableProps {
  question: IH5PQuestion;
  questionNumber: number;
  onUpdate: (updatedQuestion: IH5PQuestion) => void;
}

export function MCQEditable({
  question,
  questionNumber,
  onUpdate,
}: MCQEditableProps) {
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number | null>(
    null
  );

  useEffect(() => {
    setCorrectAnswerIndex(
      question.params.answers.findIndex((answer) => answer.correct)
    );
  }, [question.params.answers]);

  const handleQuestionChange = (newText: string) => {
    onUpdate({
      ...question,
      params: {
        ...question.params,
        question: newText,
      },
    });
  };

  const handleAnswerTextChange = (index: number, newText: string) => {
    const newAnswers = [...question.params.answers];
    newAnswers[index] = {
      ...newAnswers[index],
      text: newText,
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        answers: newAnswers,
      },
    });
  };

  const handleFeedbackChange = (
    index: number,
    field: "tip" | "chosenFeedback" | "notChosenFeedback",
    value: string
  ) => {
    const newAnswers = [...question.params.answers];
    newAnswers[index] = {
      ...newAnswers[index],
      tipsAndFeedback: {
        ...newAnswers[index].tipsAndFeedback,
        [field]: value,
      },
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        answers: newAnswers,
      },
    });
  };

  const handleCorrectToggle = (index: number) => {
    const newAnswers = question.params.answers;
    // remove old correct answer
    if (correctAnswerIndex !== null && correctAnswerIndex !== index) {
      newAnswers[correctAnswerIndex] = {
        ...newAnswers[correctAnswerIndex],
        correct: false,
      };
    }

    // set new correct value
    newAnswers[index] = {
      ...newAnswers[index],
      correct: true,
    };

    setCorrectAnswerIndex(index);
    onUpdate({
      ...question,
      params: {
        ...question.params,
        answers: newAnswers,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold mb-2">
          Question {questionNumber}
        </CardTitle>
        <Textarea
          value={question.params.question}
          onChange={(e) => handleQuestionChange(e.target.value)}
          autoFocus
          className="text-sm py-1 border-text-muted-foreground min-h-fit"
        />
      </CardHeader>

      <CardContent>
        {/* Answer Options */}
        {question.params.answers.map((answer, index) => (
          <>
            <Label
              className={cn(
                `${
                  index !== correctAnswerIndex && "cursor-pointer"
                } text-sm font-normal text-muted-foreground`
              )}
              onClick={() => handleCorrectToggle(index)}
            >
              {answer.correct ? (
                <CheckCircle className="h-4 w-4 text-green-600"></CheckCircle>
              ) : (
                <XCircle className="h-4 w-4 text-red-600"></XCircle>
              )}
              {answer.correct ? " Correct Answer" : " Incorrect Answer"}
            </Label>
            <div key={index} className="flex flex-col items-start mt-1">
              <div className="flex-1 w-full">
                <Input
                  value={answer.text}
                  onChange={(e) =>
                    handleAnswerTextChange(index, e.target.value)
                  }
                  className="text-sm"
                />

                {/* Feedback fields */}
                <div className="mt-2 space-y-4 pl-2 border-l-2 border-muted">
                  <div>
                    <Label className="text-xs font-normal text-muted-foreground">
                      Tip (optional)
                    </Label>
                    <Input
                      value={answer.tipsAndFeedback?.tip || ""}
                      onChange={(e) =>
                        handleFeedbackChange(index, "tip", e.target.value)
                      }
                      placeholder="Hint for this answer"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-normal text-muted-foreground">
                      Chosen Feedback (optional)
                    </Label>
                    <Input
                      value={answer.tipsAndFeedback?.chosenFeedback || ""}
                      onChange={(e) =>
                        handleFeedbackChange(
                          index,
                          "chosenFeedback",
                          e.target.value
                        )
                      }
                      placeholder="Feedback when selected"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-normal text-muted-foreground">
                      Not Chosen Feedback (optional)
                    </Label>
                    <Input
                      value={answer.tipsAndFeedback?.notChosenFeedback || ""}
                      onChange={(e) =>
                        handleFeedbackChange(
                          index,
                          "notChosenFeedback",
                          e.target.value
                        )
                      }
                      placeholder="Feedback when not selected"
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
                <Separator className="my-4" />
              </div>
            </div>
          </>
        ))}
      </CardContent>
    </Card>
  );
}
